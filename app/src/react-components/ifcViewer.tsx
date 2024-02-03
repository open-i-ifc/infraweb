import * as React from "react"
import * as OBC from "openbim-components"
import { AlignTool } from "../openbim-tools/align"
import { FragmentsGroup } from "bim-fragment"
import * as THREE from "three"
import { useState } from "react"
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

    // const fetched = await fetch("file/url");
    // const arrayBuffer = await fetched.arrayBuffer();
    // const buffer = new Uint8Array(arrayBuffer);

    // ifcLoader.load(buffer, "name")


    const createViewer = async () => {

        let modelMatrix: THREE.Matrix4

        viewer = new OBC.Components()
        setViewer(viewer)


        const sceneComponent = new OBC.SimpleScene(viewer)
        sceneComponent.setup()
        viewer.scene = sceneComponent
        scene = sceneComponent.get()
        scene.background = null
        const viewerContainer = document.getElementById("viewer-container") as HTMLDivElement
        const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainer)
        // const rendererComponent = new OBC.SimpleRenderer(viewer, viewerContainer)

        const renderer = rendererComponent.get()
        console.log(renderer)

        renderer.setPixelRatio(window.devicePixelRatio);

        viewer.renderer = rendererComponent as unknown as OBC.SimpleRenderer

        const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer)
        viewer.camera = cameraComponent
        console.log(viewer.camera)
        const raycasterComponent = new OBC.SimpleRaycaster(viewer)
        viewer.raycaster = raycasterComponent

        const grid = new OBC.SimpleGrid(viewer);
        renderer.shadowMap.enabled = true;

        viewer.init()

        const ifcLoader = new OBC.FragmentIfcLoader(viewer)
        await ifcLoader.setup()
        console.log(ifcLoader)

        // const highlighter = new OBC.FragmentHighlighter(viewer)
        // await highlighter.setup()

        const culler = new OBC.ScreenCuller(viewer)
        await culler.setup()
        cameraComponent.controls.addEventListener("sleep", () => culler.needsUpdate = true)

        const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer)
        // highlighter.events.select.onClear.add(() => {
        // propertiesProcessor.cleanPropertiesList()
        // })

        async function onModelLoaded(model: FragmentsGroup) {
            alignTool.setModel(model)
        }

        //const scene = sceneComponent.get()


        ifcLoader.onIfcLoaded.add(async (model) => {
            modelMatrix = model.coordinationMatrix
            await drawAxis(modelMatrix)

            for (const fragment of model.items) { culler.add(fragment.mesh) }
            propertiesProcessor.process(model)
            // highlighter.events.select.onHighlight.add((selection) => {
            //     const fragmentID = Object.keys(selection)[0]
            //     const expressID = Number([...selection[fragmentID]][0])
            //     propertiesProcessor.renderProperties(model, expressID)
            // })
            // highlighter.update()
            culler.needsUpdate = true
            onModelLoaded(model)

            const localClipper = new OBC.EdgesClipper(viewer);

            localClipper.enabled = true;

            setClipper(localClipper)

        })

        const alignTool = new AlignTool(viewer)

        const mainToolbar = new OBC.Toolbar(viewer)
        mainToolbar.addChild(
            ifcLoader.uiElement.get("main"),
            propertiesProcessor.uiElement.get("main"),
            alignTool.uiElement.get("activationBtn")
        )

        viewer.ui.addToolbar(mainToolbar)

    }

    const adjustIndex = async (value: number) => {

        if (clipper && crv) {

            let t = value / 100

            let cenPt = crv.getPointAt(t)
            let tangent = crv.getTangentAt(t)

            clipper.deleteAll()
            clipper.createFromNormalAndCoplanarPoint(tangent, cenPt)
        }
    }


    const drawAxis = async (modelMatrix: THREE.Matrix4) => {

        let newPoints = []

        for (let i = 0; i < pointsData.length; i++) {
            newPoints.push(new THREE.Vector3(pointsData[i].x + modelMatrix.elements[12], pointsData[i].z + modelMatrix.elements[13], -(pointsData[i].y - modelMatrix.elements[14])));
        }

        const curve = new THREE.CatmullRomCurve3(newPoints)
        setCrv(curve)

        const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
        let geometry = new THREE.BufferGeometry().setFromPoints(newPoints);
        const line = new THREE.Line(geometry, material);

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

        <div
            id="viewer-container"
            className="dashboard-card"
            style={{ minWidth: 0, position: "relative", height: "100vh" }}
        >
            <input
                type="range"
                min="0"
                max="100"
                value={index}
                onChange={handleSliderChange}
                style={{ position: "absolute", bottom: 20, left: "20%", transform: "translateX(-50%)" }}
            />
        </div>
    )
}