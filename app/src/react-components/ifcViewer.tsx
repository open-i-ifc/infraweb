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
    const [crv, setCrv] = useState<THREE.CatmullRomCurve3 | null>(null);
    const [clipper, setClipper] = useState<OBC.EdgesClipper | null>(null);
    const [secondCamera, setSecondCamera] = useState<OBC.OrthoPerspectiveCamera| null>(null)
    const [firstCamera, setFirstCamera] = useState<OBC.OrthoPerspectiveCamera| null>(null)
    const [prevClipperPos, setPrevClipperPos] = useState<THREE.Vector3 | null>(null)
    // const fetched = await fetch("file/url");
    // const arrayBuffer = await fetched.arrayBuffer();
    // const buffer = new Uint8Array(arrayBuffer);

    // ifcLoader.load(buffer, "name")


    const createViewer = async () => {

        let modelMatrix: THREE.Matrix4

        viewer = new OBC.Components()
        setViewer(viewer)

        const sceneComponent = new OBC.SimpleScene(viewer)
        await sceneComponent.setup()
        viewer.scene = sceneComponent
        scene = sceneComponent.get()
        scene.background = null
        const viewerContainer = document.getElementById("viewer-container1") as HTMLDivElement
        console.log(viewerContainer)
        //const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainer)
        const rendererComponent = new OBC.SimpleRenderer(viewer, viewerContainer)

        const renderer = rendererComponent.get()
        console.log(renderer)

        renderer.setPixelRatio(window.devicePixelRatio);

        viewer.renderer = rendererComponent

        const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer)
        viewer.camera = cameraComponent
        setFirstCamera((cameraComponent))

        const position = new THREE.Points()
        const target = new THREE.Points()

        //(cameraComponent, position, target)



        const raycasterComponent = new OBC.SimpleRaycaster(viewer)
        viewer.raycaster = raycasterComponent
        await viewer.init()
        const fragmentManager = new OBC.FragmentManager(viewer)
        const grid = new OBC.SimpleGrid(viewer);
        renderer.shadowMap.enabled = true;

        /////////////////

        const flatCamera = new OBC.OrthoPerspectiveCamera(viewer)
        await flatCamera.setProjection("Orthographic")
        setSecondCamera((flatCamera))
        const viewerContainer2 = document.getElementById("viewer-container2") as HTMLDivElement
        const renderComponent2 = new OBC.SimpleRenderer(viewer,viewerContainer2 )
        flatCamera.controls.setLookAt(0,10,0,0,0,0)
        flatCamera.controls.update(1)
        rendererComponent.onAfterUpdate.add(() => {
            flatCamera.update(0)
            renderComponent2.overrideCamera = flatCamera.get()
            renderComponent2.update()
        })
        /* onAfterUpdate(() => {


        }) */




        //////////////////
        const ifcLoader = new OBC.FragmentIfcLoader(viewer)
        await ifcLoader.setup()

        const highlighter = new OBC.FragmentHighlighter(viewer)
        await highlighter.setup()

        const culler = new OBC.ScreenCuller(viewer)
        await culler.setup()
        cameraComponent.controls.addEventListener("sleep", () => culler.needsUpdate = true)

        const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer)
        highlighter.events.select.onClear.add(() => {
        propertiesProcessor.cleanPropertiesList()
        })

        async function onModelLoaded(model: FragmentsGroup) {
            console.log("Model loaded")
            modelMatrix = model.coordinationMatrix
            await drawAxis(modelMatrix)
            alignTool.setModel(model)
            const localClipper = new OBC.EdgesClipper(viewer);

            localClipper.enabled = true;

            const shapeFill = new THREE.MeshBasicMaterial({color: 'lightgray', side: 2});
            const shapeLine = new THREE.LineBasicMaterial({ color: 'black' });
            const shapeOutline = new THREE.MeshBasicMaterial({color: 'black', opacity: 0.2, side: 2, transparent: true});
            const meshes = viewer.meshes
            console.log(meshes)
            console.log(meshes.length)

            localClipper.styles.create('White shape, black lines', new Set(meshes), shapeLine, shapeFill, shapeOutline);

            setClipper(localClipper)
        }


        ifcLoader.onIfcLoaded.add(async (model) => {



            for (const fragment of model.items) { culler.add(fragment.mesh) }
            propertiesProcessor.process(model)

                /* Each Shape different Color
                for(let i=0; i++; i <= meshes.length){
                    const mesh = meshes[i]
                    console.log(mesh)
                    const materials = mesh.material as THREE.Material[]
                    const material = materials[0] as THREE.MeshLambertMaterial
                    const color = material.color
                    const shapeFill = new THREE.MeshBasicMaterial({color: "white", side: 2});
                    console.log(shapeFill)
                    const shapeLine = new THREE.LineBasicMaterial({ color: color });
                    console.log(shapeLine)
                    const shapeOutline = new THREE.MeshBasicMaterial({color: color, opacity: 0.2, side: 2, transparent: true});
                    console.log(shapeOutline)
                    clipper.styles.create(`${i.toString}`, new Set([mesh]), shapeLine, shapeFill, shapeOutline);

                }
                */

            culler.needsUpdate = true
            onModelLoaded(model)



        })
        

        const importFragmentBtn = new OBC.Button(viewer)
        importFragmentBtn.materialIcon = "upload"
        importFragmentBtn.tooltip = "Load FRAG"
    
        importFragmentBtn.onClick.add(() => {
            console.log("Import FRAG")
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.frag'
          const reader = new FileReader()
          reader.addEventListener("load", async () => {
            const binary = reader.result
            if (!(binary instanceof ArrayBuffer)) { return }
            const fragmentBinary = new Uint8Array(binary)
            const group = await fragmentManager.load(fragmentBinary)

            
            viewer.scene.get().add(group);
            //highlighter.update();
            onModelLoaded(group)
          })
          input.addEventListener('change', () => {
            const filesList = input.files
            console.log(filesList)
            if (!filesList) { return }
            reader.readAsArrayBuffer(filesList[0])
          })
          input.click()
          console.log("Loaded!")

        })
        
        function  exportFragments(model: FragmentsGroup) {
          const fragmentBinary = fragmentManager.export(model)
          const blob = new Blob([fragmentBinary])
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${model.name.replace(".ifc", "")}.frag`
          a.click()
          URL.revokeObjectURL(url)
        }

        const exportFragmentBtn = new OBC.Button(viewer)
        exportFragmentBtn.materialIcon = "download"
        exportFragmentBtn.tooltip = "Export FRAG"

        exportFragmentBtn.onClick.add(() => {

            const fragmentManager = viewer.tools.get(OBC.FragmentManager)
            const fragments = fragmentManager
            if(!fragments.groups.length) return;
            const group = fragments.groups[0];
            const data = fragments.export(group);
            const blob = new Blob([data]);
            const file = new File([blob], "3dfile.frag");
            download(file);
               
            
            
        })

        function download(file:any) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(file);
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }

        
        const alignTool = new AlignTool(viewer)

        const mainToolbar = new OBC.Toolbar(viewer)
        mainToolbar.addChild(
            ifcLoader.uiElement.get("main"),
            importFragmentBtn,
            exportFragmentBtn
        )

        

        viewer.ui.addToolbar(mainToolbar)

        //const scene = sceneComponent.get()
        // const clipper = new OBC.EdgesClipper(  viewer );
        // clipper.enabled = true;
        // viewerContainer.ondblclick = () => clipper.create();
    }

    function updateCameraPosition(cameraComponent: OBC.OrthoPerspectiveCamera, position: THREE.Vector3, target: THREE.Vector3){

            cameraComponent.controls.setPosition(position.x,position.y, position.z, false)
            cameraComponent.controls.setTarget(target.x, target.y, target.z)

            //cameraComponent.get(OBC.)
            const projectionType = cameraComponent.getProjection() as OBC.CameraProjection
            console.log(projectionType)
            //if(projectionType)
            //if(cameraComponent.activeCamera.toString() === "THREE.PerspectiveCamera")
              //  cameraComponent.get().far = .1
            //cameraComponent.activeCamera = "PerspectiveCamera"

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
            clipper.visible = false
            let startPt = new THREE.Vector3(cenPt.x-tangent.x*10,cenPt.y-tangent.y,cenPt.z-tangent.z*10)

            let m_vec = new THREE.Vector3().subVectors(cenPt,prev_clipper_pos!)

            let new_cam_pos = new THREE.Vector3().addVectors(prev_cam_pos,m_vec)

            setPrevClipperPos(cenPt)

            console.log(startPt,cenPt,tangent)
            updateCameraPosition(secondCamera!,startPt, cenPt)
            updateCameraPosition(firstCamera!,new_cam_pos, cenPt)
        }



    }


    const drawAxis = async (modelMatrix: THREE.Matrix4) => {


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
            style={{ minWidth: 0, position: "relative", height: "100vh", width: "50vw" }}
        />
        </div>
    )
}