/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react"
import * as OBC from "openbim-components"
import * as THREE from "three"
import { AlignTool } from "../openbim-tools/align"
import { FragmentsGroup } from "bim-fragment"
import { threadId } from "worker_threads"
import { useState } from "react"
import {Vector3} from "three";
import {reflectVector} from "three/examples/jsm/nodes/accessors/ReflectVectorNode";
import * as dat from 'three/examples/jsm/libs/lil-gui.module.min';

interface Props {
    
}
const pointsData: { [key: string]: any } = require('../points.json');


interface IViewerContext {
    viewer: OBC.Components | null,
    setViewer: (viewer: OBC.Components | null) => void
}

export const ViewerContext = React.createContext<IViewerContext>({
    viewer: null,
    setViewer: () => { }
})


export function ViewerProvider(props: { children: React.ReactNode }) {
    const [viewer, setViewer] = React.useState<OBC.Components | null>(null)
    return (
        <ViewerContext.Provider value={{
            viewer, setViewer
        }} >
            {props.children}
        </ViewerContext.Provider >
    )
}





export function IFCViewer(props: Props) {

    const { setViewer } = React.useContext(ViewerContext)
    let viewer: OBC.Components
    let scene

    let [index, setIndex] = useState(50)
    let mainModelLoaded = false
    const [crv, setCrv] = useState<THREE.CatmullRomCurve3 | null>(null);
    const [clipper, setClipper] = useState<OBC.EdgesClipper | null>(null);
    const [secondCamera, setSecondCamera] = useState<OBC.OrthoPerspectiveCamera| null>(null)
    const [firstCamera, setFirstCamera] = useState<OBC.OrthoPerspectiveCamera| null>(null)
    const [prevClipperPos, setPrevClipperPos] = useState<THREE.Vector3 | null>(null)
    const [renderer1, setRenderer1] = useState<OBC.SimpleRenderer | null>(null)
    const [renderer2, setRenderer2] = useState<OBC.SimpleRenderer | null>(null)
    


    const createViewer = async () => {

        let modelMatrix: THREE.Matrix4

        viewer = new OBC.Components()
        setViewer(viewer)
        //Create Scene
        const sceneComponent = new OBC.SimpleScene(viewer)
        await sceneComponent.setup()
        viewer.scene = sceneComponent
        scene = sceneComponent.get()
        
        scene.background = new THREE.Color("white")
        

        //Create viewer container
        const viewerContainer = document.getElementById("viewer-container1") as HTMLDivElement
        //Create renderer component

        const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainer)
        //const rendererComponent = new OBC.SimpleRenderer(viewer, viewerContainer)

        
        
        const renderer = rendererComponent.get()
        renderer.setPixelRatio(window.devicePixelRatio);
        viewer.renderer = rendererComponent
        renderer.shadowMap.enabled = true;

        setRenderer1(rendererComponent)
        

        //Create camera component
        const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer)
        viewer.camera = cameraComponent
        //cameraComponent.get().far = 1
        cameraComponent.updateAspect()
        setFirstCamera((cameraComponent))

        //Create raycaster
        const raycaster = new OBC.SimpleRaycaster(viewer)
        viewer.raycaster = raycaster


        //Initialize viewer
        await viewer.init()

        viewerContainer.ondblclick = () => localClipper.create();

        

        
        

        

        //Create fragmentManager
        const fragmentManager = new OBC.FragmentManager(viewer)
        const grid = new OBC.SimpleGrid(viewer);

        const postproduction = rendererComponent.postproduction
        postproduction.enabled = true;
        postproduction.customEffects.outlineEnabled = true;
        postproduction.customEffects.excludedMeshes.push(grid.get());
        
        
        //Create highligter
        const highlighter = new OBC.FragmentHighlighter(viewer)
        highlighter.setup()

        const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer)
        highlighter.events.select.onClear.add(()=>{
            propertiesProcessor.cleanPropertiesList()
        })

        //Create second camera

        const flatCamera = new OBC.OrthoPerspectiveCamera(viewer)
        await flatCamera.setProjection("Orthographic")

        flatCamera.controls.setLookAt(0,10,0,0,0,0)
        flatCamera.controls.update(1)
        flatCamera.controls.dollySpeed = 0 // disable "zoom" for second camera
        flatCamera.get().far = 1
        setSecondCamera((flatCamera))
        

        //create second viewer container
        const viewerContainer2 = document.getElementById("viewer-container2") as HTMLDivElement

        //create second render component
        const renderComponent2 = new OBC.SimpleRenderer(viewer,viewerContainer2 )
        
        rendererComponent.onAfterUpdate.add(() => {
            flatCamera.update(0) 
            renderComponent2.overrideCamera = flatCamera.get()
            renderComponent2.update()
        })
        setRenderer2(renderComponent2)



        //create ifc loader
        const ifcLoader = new OBC.FragmentIfcLoader(viewer)
        await ifcLoader.setup()

        //create culler component
        const culler = new OBC.ScreenCuller(viewer)
        await culler.setup()
        cameraComponent.controls.addEventListener("sleep", () => culler.needsUpdate = true)

        //create clipper
        const localClipper = new OBC.EdgesClipper(viewer);
        localClipper.enabled = true;
        const classifier = new OBC.FragmentClassifier(viewer)
        const styler = new OBC.FragmentClipStyler(viewer)
        styler.setup()

        

        
        //draw axis and create section materials
        async function onModelLoaded(model: FragmentsGroup) {
            
            const shapeFill = new THREE.MeshBasicMaterial({color: 'lightgray', side: 2});
            const shapeLine = new THREE.LineBasicMaterial({ color: 'black' });
            const shapeOutline = new THREE.MeshBasicMaterial({color: 'black', opacity: 0.2, side: 2, transparent: true});
            const meshes = viewer.meshes
            localClipper.styles.create('White shape, black lines', new Set(meshes), shapeLine, shapeFill, shapeOutline);
            

            highlighter.update()
            console.log("Model loaded")
            console.log(model)
            if(!mainModelLoaded)
            {
                modelMatrix = model.coordinationMatrix
                await drawAxis(modelMatrix)
            }
            alignTool.setModel(model)

            setClipper(localClipper)
        }

        async function onPropertiesLoaded(model: FragmentsGroup){
            //create properties for property window
            try{
                classifier.byModel(model.name, model)
                classifier.byStorey(model)
                classifier.byEntity(model)
                
                await styler.update()
                classifier.get()
                const tree = await createModelTree()
                await classificationWindow.slots.content.dispose(true)
                classificationWindow.addChild(tree)
        
                propertiesProcessor.process(model)
                highlighter.events.select.onHighlight.add((fragmentMap) =>{
                    const expressID = [...Object.values(fragmentMap)[0]][0]
                    propertiesProcessor.renderProperties(model, Number(expressID) )
                
                })
            } catch (error){
                alert(error)
            }
        }


        ifcLoader.onIfcLoaded.add(async (model) => {
            for (const fragment of model.items) { culler.add(fragment.mesh) }
            culler.needsUpdate = true
            onModelLoaded(model)
            onPropertiesLoaded(model)
        })
        

        const importFragmentBtn = new OBC.Button(viewer)
        importFragmentBtn.materialIcon = "upload"
        importFragmentBtn.tooltip = "Load FRAG"
        

        const exportFragmentBtn = new OBC.Button(viewer)
        exportFragmentBtn.materialIcon = "download"
        exportFragmentBtn.tooltip = "Export FRAG"
        
        exportFragmentBtn.onClick.add(() => {
            
            
            for(let i=0; i< fragmentManager.groups.length;i++){
                exportFragments(fragmentManager.groups[i])
                exportProperties(fragmentManager.groups[i])
            }

            
            
        })

        function download(file:any) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(file);
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
        
       
        
        
        

        function exportFragments(model: FragmentsGroup){
            console.log(model)
            const fragmentBinary = fragmentManager.export(model)
            const blob = new Blob ([fragmentBinary],{type:"application/json"})
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${model.name.replace(".ifc","")}.frag`
            a.click()
            URL.revokeObjectURL(url)
        }
        
        function exportProperties(model: FragmentsGroup){
            const json = JSON.stringify(model.properties, null,2)
            const blob = new Blob ([json],{type:"application/json"})
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${model.name}`.replace(".ifc","")
            a.click()
            URL.revokeObjectURL(url)
        }

        function importFrag(){
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.frag'
            const reader = new FileReader()
            
            reader.addEventListener("load", async() => {
                const binary = reader.result
                if (!(binary instanceof ArrayBuffer)) { return }
                const fragmentBinary = new Uint8Array(binary)
                const model = await fragmentManager.load(fragmentBinary)
                importProperties(model)
                onModelLoaded(model)
            })

            
            input.addEventListener('change', () => {
              const filesList = input.files
              if (!filesList) { return }
              reader.readAsArrayBuffer(filesList[0])
            })
            input.click()
            
        }
        
        async function importProperties(model: FragmentsGroup){
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'application/json'
            const reader = new FileReader()
            reader.addEventListener("load", async() => {
              const json = reader.result as string
              if (!json) { return }
        
              model.properties = JSON.parse(json)
              onPropertiesLoaded(model)
              return
            })
            input.addEventListener('change', () => {
              const filesList = input.files
              if (!filesList) { return }
              reader.readAsText(filesList[0])
            })
            input.click()
            
        }
        
        importFragmentBtn.onClick.add(()=>{
            importFrag()
        })
        
        
        
        const alignTool = new AlignTool(viewer)

        const stylerButton = styler.uiElement.get("mainButton") as OBC.Button

        const classificationWindow = new OBC.FloatingWindow(viewer)
        classificationWindow.visible = false
        viewer.ui.add(classificationWindow)
        classificationWindow.title ="Model Groups"

        const classificationBtn = new OBC.Button(viewer)
        classificationBtn.materialIcon = "account_tree"

        classificationBtn.onClick.add(()=>{
            classificationWindow.visible = !classificationWindow.visible
            classificationBtn.active = classificationWindow.visible
        })

        const mainToolbar = new OBC.Toolbar(viewer)
        mainToolbar.addChild(
            ifcLoader.uiElement.get("main"),
            importFragmentBtn,
            exportFragmentBtn,
            stylerButton,
            propertiesProcessor.uiElement.get("main"),
            classificationBtn
        )

        const zoomToolbar = new OBC.Toolbar(viewer)
        
        
        const zoomInBtn = new OBC.Button(viewer)
        zoomInBtn.materialIcon = "zoom_in"

        zoomInBtn.onClick.add(()=>{
            const currentZoom = flatCamera.get().zoom
            flatCamera.controls.zoom(+currentZoom/2)
        })

        const zoomOutBtn = new OBC.Button(viewer)
        zoomOutBtn.materialIcon = "zoom_out"

        zoomOutBtn.onClick.add(()=>{
            const currentZoom = flatCamera.get().zoom
            flatCamera.controls.zoom(-currentZoom/2)
        })

        zoomToolbar.addChild(
            zoomInBtn,
            zoomOutBtn
        )

       


        

        viewer.ui.addToolbar(mainToolbar)

        viewer.ui.addToolbar(zoomToolbar)

        

        async function createModelTree(){
            const fragmentTree = new OBC.FragmentTree(viewer)
            await fragmentTree.init()
            await fragmentTree.update(["model","storeys", "entities"]) //
            fragmentTree.onHovered.add((fragmentMap) =>{
                highlighter.highlightByID("hover", fragmentMap.items)
            })
            fragmentTree.onSelected.add((fragmentMap)=>{
                highlighter.highlightByID("select", fragmentMap.items)
            })
            const tree = fragmentTree.get().uiElement.get("tree")
            return tree
        
        }


        
   
    }

    

    function updateCameraPosition(cameraComponent: OBC.OrthoPerspectiveCamera, position: THREE.Vector3, target: THREE.Vector3){

            cameraComponent.controls.setPosition(position.x,position.y, position.z, false)
            cameraComponent.controls.setTarget(target.x, target.y, target.z)

           
            const projectionType = cameraComponent.getProjection() as OBC.CameraProjection
            

            cameraComponent.controls.update(1)

    }
   
    

    const adjustIndex = async (value: number) => {

        if (clipper && crv) {

            let prev_cam_pos = firstCamera!.controls.getPosition(new THREE.Vector3())
            let prev_clipper_pos = prevClipperPos
            let t = value / 100

            let cenPt = crv.getPointAt(t)
            let tangent = crv.getTangentAt(t)

            
            clipper.deleteAll()
            clipper.createFromNormalAndCoplanarPoint(tangent, cenPt)
            clipper.styles.enabled = true
            
            //clipper.updateEdges()
            //clipper.create()

            const plane = clipper.get()
            console.log(plane)
            plane[0].update()
            plane[0].updateFill()
            plane[0].edges.setVisible(true)
            plane[0].edges.update()
            
            clipper.updateEdges()
            renderer1?.updateClippingPlanes()
            renderer1?.update()
            renderer2?.updateClippingPlanes()
            renderer2?.update()
            clipper.updateEdges()
            

            
            
            
            //clipper.
            clipper.visible = false
            let startPt = new THREE.Vector3(cenPt.x-tangent.x*.1,cenPt.y-tangent.y*.1,cenPt.z-tangent.z*.1)

            let m_vec = new THREE.Vector3().subVectors(cenPt,prev_clipper_pos!)

            let new_cam_pos = new THREE.Vector3().addVectors(prev_cam_pos,m_vec)
            
            setPrevClipperPos(cenPt)
            //clipper.updateEdges()

            console.log(startPt,cenPt,tangent)
            updateCameraPosition(secondCamera!,startPt, cenPt)
            updateCameraPosition(firstCamera!,new_cam_pos, cenPt)
            
            
            //secondCamera!.controls.zoom = 10
            const currentZoom = secondCamera!.get().zoom
            secondCamera?.controls.zoom(0)
            secondCamera!.get().far = .2
            secondCamera?.controls.update(1)
            

        }



    }


    const drawAxis = async (modelMatrix: THREE.Matrix4) => {
        if(!mainModelLoaded){
            mainModelLoaded = true
            console.log("Drawing axis")
            let newPoints = []

            for (let i = 0; i < pointsData.length; i++) {
                newPoints.push(new THREE.Vector3(pointsData[i].x + modelMatrix.elements[12], pointsData[i].z + modelMatrix.elements[13], -(pointsData[i].y - modelMatrix.elements[14])));
            }

            const curve = new THREE.CatmullRomCurve3(newPoints)
            setCrv(curve)
            setPrevClipperPos(curve.getPointAt(0.5))
            

            const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
            let geometry = new THREE.BufferGeometry().setFromPoints(newPoints);
            const line = new THREE.Line(geometry, material);
            console.log(geometry)
            viewer.scene.get().add(line)
        }
    }


    viewer = new OBC.Components()
    React.useEffect(() => {
        createViewer()

        return () => {

            viewer.dispose()
            setViewer(null)
        }
    }, [])

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newIndex = Number(event.target.value);
        setIndex(newIndex);
        adjustIndex(newIndex);
    };

    return (

        <div style={{ display: "flex"}}>
        <div
            id="viewer-container1"
            className="dashboard-card"
            style={{ minWidth: 0, position: "relative", height: "100vh", width: "50vw" }}
        >
                        <input
                type="range"
                min="0"
                max="100"
                value={index}
                onChange={handleSliderChange}
                style={{ position: "absolute", top: 20, left: "50%",width: "80%", transform: "translateX(-50%)"}}
            />
        </div>
        <div
            id="viewer-container2"
            className="dashboard-card"
            style={{ minWidth: 0, position: "relative", height: "100vh", width: "50vw" , borderLeft: "3px solid", borderLeftColor: "#029AE0"}}
        />
            <div style={{ position: "absolute", top: 0, right: 0, padding: '12px'}}><h1>Open I - The Simple IFC Clipper</h1></div>
            

        </div>
    )
}