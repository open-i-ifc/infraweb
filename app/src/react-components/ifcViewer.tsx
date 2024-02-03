/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react"
import * as OBC from "openbim-components"
import { AlignTool } from "../openbim-tools/align"
import { FragmentsGroup } from "bim-fragment"
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
            alignTool.setModel(model)
        }


        ifcLoader.onIfcLoaded.add(async (model) => {
            for (const fragment of model.items) { culler.add(fragment.mesh) }
            propertiesProcessor.process(model)
            highlighter.events.select.onHighlight.add((selection) => {
                const fragmentID = Object.keys(selection)[0]
                const expressID = Number([...selection[fragmentID]][0])
                propertiesProcessor.renderProperties(model, expressID)
            })
            highlighter.update()
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

        //const scene = sceneComponent.get()
        const clipper = new OBC.EdgesClipper(viewer);

        clipper.enabled = true;




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