
interface Window
{
    WMRootNode: DOM.Node;
    WMRootPanel: WM.Panel;
}

namespace WM
{
    export class Panel
    {
        static TemplateHTML = "<div class='Panel'>/div>";

        // Main generated HTML node for the control
        // TODO: Can this be made private?
        Node: DOM.Node;

        // List of panels contained by this panel, in z-order
        Panels: Panel[] = [];

        // Parent panel; can be null in the case of the browser body
        private _ParentPanel: Panel;

        // Rectangle coverage
        // Always ensure position/size are defined as they are required to calculate bottom-right
        private _Position = new int2(0);
        private _Size = new int2(0);
        private _BottomRight = new int2(0);

        // Records current visibility state
        private _Visible = false;

        constructor(position: int2, size: int2, node: DOM.Node)
        {
            // First-time initialisation of any panel resources
            if (window.WMRootNode == null)
            {
                // TODO: Can fully flesh out root panel size and event handlers here
                window.WMRootNode = $(document.body);
                window.WMRootPanel = new Panel(new int2(0), new int2(0), window.WMRootNode);
            }

            // Add to parent panel's list?
            // NO. Allow the parent panel to be null and this panel is currently unshowable

            this.Node = node;

            this._ParentPanel = window.WMRootPanel;

            // Store position/size directly so that bottom/right can be calculated
            this._Position = position;
            this._Size = size;
            this._BottomRight = int2.Add(this._Position, this._Size);

            // Apply initial settings to the node
            this.Node.Position = this._Position;
            this.Node.Size = this._Size;
            
            this.Node.MouseDownEvent.Subscribe(this.OnMouseDown);
        }

        // Cached node position
        set Position(position: int2)
        {
            this._Position = position;
            this._BottomRight = int2.Add(this._Position, this._Size);
            this.Node.Position = position;
        }
        get Position() : int2
        {
            return this._Position;
        }

        // Cached node size
        set Size(size: int2)
        {
            this._Size = size;
            this._BottomRight = int2.Add(this._Position, this._Size);
            this.Node.Size = size;
        }
        get Size() : int2
        {
            return this._Size;
        }

        // Alternative rectangle coverage
        set TopLeft(tl: int2)
        {
            this._Position = tl;
            this._Size = int2.Sub(this._BottomRight, tl);
            this.Node.Position = tl;
            this.Node.Size = this._Size;
        }
        get TopLeft() : int2
        {
            return this.Position;
        }
        set BottomRight(br: int2)
        {
            this.Size = int2.Sub(br, this._Position);
        }
        get BottomRight() : int2
        {
            return this._BottomRight;
        }

        // Tells whether the panel thinks it's visible or not
        get Visible() : boolean
        {
            return this._Visible;
        }

        // Panel this one is contained by
        set ParentPanel(parent_panel : Panel)
        {
            this._ParentPanel = parent_panel;
        }
        get ParentPanel() : Panel
        {
            return this._ParentPanel;
        }

        // Make the panel visible
        Show()
        {
            // Only show if there's a oarent panel to host this one
            if (this.ParentPanel != null)
            {
                this.ParentPanel.Node.Append(this.Node);
                this._Visible = true;
            }
        }

        // Hide the panel
        Hide()
        {
            // Safe to detach a node with no parent; saves a branch here
            this.Node.Detach();
            this._Visible = false;
        }

        // Add as a child and show
        Add(panel: Panel) : Panel
        {
            // Remove from any existing parent
            if (panel.ParentPanel)
                panel.ParentPanel.Remove(panel);

            // Parent this this panel
            this.Panels.push(panel);
            panel.ParentPanel = this;

            panel.Show();

            return panel;
        }

        // Hide and remove from this panel
        Remove(panel: Panel)
        {
            panel.Hide();

            // Remove from the panel list and orphan
            let index = this.Panels.indexOf(panel);
            this.Panels.splice(index);
            panel.ParentPanel = null;
        }

        SendToTop()
        {
            let parent_panel = this.ParentPanel;
            if (parent_panel != null)
            {
                let parent_panels = parent_panel.Panels;
                
                // Push to the back of the parent's panel list
                let index = parent_panels.indexOf(this);
                if (index != -1)
                {
                    parent_panels.splice(index, 1);
                    parent_panels.push(this);

                    // Recalculate z-indices for visible sort
                    parent_panel.UpdateZIndices();
                }
            }
        }

        SendToBottom()
        {
            let parent_panel = this.ParentPanel;
            if (parent_panel != null)
            {
                let parent_panels = parent_panel.Panels;

                // Push to the front of the parent's panel list 
                let index = parent_panels.indexOf(this);
                if (index != -1)
                {
                    parent_panels.splice(index, 1);
                    parent_panels.unshift(this);

                    // Recalculate z-indices for visible sort
                    parent_panel.UpdateZIndices();
                }
            }
        }

        private UpdateZIndices()
        {
            // TODO: ZINDEX needs to be relative to parent!

            // Set a CSS z-index for each visible panel from the bottom up
            for (let i = 0; i < this.Panels.length; i++)
            {
                let panel = this.Panels[i];
                if (!panel.Visible)
                    continue;

                // Ensure there's space between each window for the elements inside to be sorted
                // TODO: Update with full knowledge of child panels
                let z = (i + 1) * 10;
                this.Node.ZIndex = z;
            }
        }

        private OnMouseDown = (event: MouseEvent) =>
        {
            // Allow bubble-up for this event so that it filters through nested windows
            this.SendToTop();
        }
    }
}
