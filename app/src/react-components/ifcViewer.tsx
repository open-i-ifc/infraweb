import * as React from "react"
import * as OBC from "openbim-components"
<<<<<<< HEAD
import * as THREE from "three"
import { FragmentsGroup, IfcProperties, Fragment } from "bim-fragment"  

=======
import { AlignTool } from "../openbim-tools/align"
import { FragmentsGroup } from "bim-fragment"
>>>>>>> 1b4cb60fc1de234a841dce28b2740c9009298900
interface Props {
    
}

interface IViewerContext {
    viewer: OBC.Components | null,
    setViewer: (viewer: OBC.Components | null) => void
}

export const ViewerContext = React.createContext<IViewerContext>({
    viewer: null, 
    setViewer: () => {}
})

export function ViewerProvider (props: {children: React.ReactNode}) {
    const [viewer, setViewer] = React.useState<OBC.Components | null>(null)
    return (
        <ViewerContext.Provider value={{
            viewer,setViewer
        }} >
            { props.children }
        </ViewerContext.Provider >
    )
}




export function IFCViewer(props: Props) {

    const { setViewer } = React.useContext(ViewerContext)
    let viewer: OBC.Components
    let scene

    const createViewer = async () => {
        viewer = new OBC.Components()
        setViewer(viewer)
        
        const sceneComponent = new OBC.SimpleScene(viewer)
        sceneComponent.setup()
        viewer.scene = sceneComponent
        scene = sceneComponent.get()
        scene.background = null
        const viewerContainer = document.getElementById("viewer-container") as HTMLDivElement
        //const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainer)
        const rendererComponent = new OBC.SimpleRenderer(viewer, viewerContainer)

        const renderer = rendererComponent.get()
        console.log(renderer)

        renderer.setPixelRatio( window.devicePixelRatio );
        
        
        viewer.renderer = rendererComponent as unknown as OBC.SimpleRenderer
        
        const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer)
        viewer.camera = cameraComponent
    
        const raycasterComponent = new OBC.SimpleRaycaster(viewer)
        viewer.raycaster = raycasterComponent
        
        const grid = new OBC.SimpleGrid(viewer);
        renderer.shadowMap.enabled = true;


        viewer.init()
        
        const ifcLoader = new OBC.FragmentIfcLoader(viewer)
        await ifcLoader.setup()

       

        const culler = new OBC.ScreenCuller(viewer)
        await culler.setup()
        cameraComponent.controls.addEventListener("sleep", () => culler.needsUpdate = true)

        const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer)
       

        const clipper = new OBC.EdgesClipper(viewer);

        clipper.enabled = true;

        

<<<<<<< HEAD
        ifcLoader.onIfcLoaded.add(async model => {
            console.log(model)
=======
        async function onModelLoaded(model: FragmentsGroup) {
            alignTool.setModel(model)
        }


        ifcLoader.onIfcLoaded.add(async (model) => {
>>>>>>> 1b4cb60fc1de234a841dce28b2740c9009298900
            for (const fragment of model.items) { culler.add(fragment.mesh) }
            propertiesProcessor.process(model)
                
                const shapeFill = new THREE.MeshBasicMaterial({color: 'lightgray', side: 2});
                const shapeLine = new THREE.LineBasicMaterial({ color: 'black' });
                const shapeOutline = new THREE.MeshBasicMaterial({color: 'black', opacity: 0.2, side: 2, transparent: true});
                const meshes = viewer.meshes
                console.log(meshes)
                console.log(meshes.length)
                
                clipper.styles.create('White shape, black lines', new Set(meshes), shapeLine, shapeFill, shapeOutline);
                
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

        
        const alignTool = new AlignTool(viewer)

        const mainToolbar = new OBC.Toolbar(viewer)
        mainToolbar.addChild(
            ifcLoader.uiElement.get("main"),
            propertiesProcessor.uiElement.get("main"),
            alignTool.uiElement.get("activationBtn")
        )

        

        viewer.ui.addToolbar(mainToolbar)

        viewerContainer.ondblclick = () => clipper.create();
        console.log(clipper)

        //const scene = sceneComponent.get()
        

        




    }

    viewer = new OBC.Components()
    React.useEffect(() => {
        createViewer()
        
        return () => {
            
            viewer.dispose()
            setViewer(null)
        }
      }, [])

    return (
        <div
            id="viewer-container"
            className="dashboard-card"
            style={{ minWidth: 0, position: "relative", height: "100vh"}}
        />
    )
}