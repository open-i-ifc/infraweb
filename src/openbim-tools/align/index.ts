import * as OBC from "openbim-components"
import {FragmentsGroup} from "bim-fragment"

export class AlignTool extends OBC.Component<void> implements OBC.UI{
    static uuid = "c94f8291-ebd7-40e6-bc55-dc5a3fc77f50"
    private _components: OBC.Components
    enabled: boolean = true
    alignWindow?: OBC.FloatingWindow
    alignIDInput?: OBC.TextInput
    model?: FragmentsGroup
    uiElement = new OBC.UIElement<
    {
        activationBtn: OBC.Button
    }>()

    constructor (components: OBC.Components) {
        super(components)
        this._components = components

        this.setUI()
    }

    private setUI() {
        const activationBtn = new OBC.Button(this._components)
        activationBtn.materialIcon = "pan_tool_alt"
        activationBtn.tooltip = "Alignment Tool"
        
        
        this.alignWindow = new OBC.FloatingWindow(this._components)
        this._components.ui.add(this.alignWindow)
        this.alignWindow.title = "Alignment"
        this.alignWindow.visible = false
        activationBtn.onClick.add(() => {
            
            console.log("Alignment")
            if(this.alignWindow) {
                this.alignWindow.visible = true
            }
            
            
        })
        this.uiElement.set({activationBtn})

        
    }

    setModel (model: FragmentsGroup) {
        this.model = model
        console.log(this.model)
    }

    get(): void {

    }

    async dispose() {

    }


}