class LightCard2025 extends HTMLElement {
    constructor() {
        super();
        this.editorContentVisible = false; // Initial state of editor-content
    }

    set hass(hass) {
        this._hass = hass;
        this.render();
    }

    connectedCallback() {
        // Initial rendering when element is connected to the DOM
        this.render();
    }

    render() {
        if (!this._hass || !this._config) {
            return;
        }

        if (!this.content) {
            const card = document.createElement('ha-card');
            this.content = document.createElement('div');
            card.appendChild(this.content);
            this.appendChild(card);
        }

        const entityId = this._config.entity;
        const state = this._hass.states[entityId];
        const attributes = state.attributes;
        const config = this._config;

        if (state) {
            const icon = this._validateIcon(config.icon) ? this._validateIcon(config.icon) : attributes.icon ? attributes.icon : 'mdi:lightbulb';
            const name = config.name ? config.name : attributes.friendly_name ? attributes.friendly_name : entityId;
            const hue = attributes.hs_color ? attributes.hs_color[0].toFixed(0) : 0;
            const saturation = attributes.hs_color ? attributes.hs_color[1].toFixed(2) : 0;
            const lightness = attributes.brightness ? attributes.brightness : 1;
            const kelvin = attributes.color_temp_kelvin ? attributes.color_temp_kelvin : 2000;
            const minKelvin = kelvinToRgb(attributes.min_color_temp_kelvin ? attributes.min_color_temp_kelvin : 2000);
            const maxKelvin = kelvinToRgb(attributes.max_color_temp_kelvin ? attributes.max_color_temp_kelvin : 6500);

            let red, green, blue, warm, cold = attributes.rgbww_color ? attributes.rgbww_color : attributes.rgbw_color ? [...attributes.rgbw_color, 0] : attributes.rgb_color ? [...attributes.rgb_color, 0, 0] : [0, 0, 0, 0, 0]

            let editorBtnHTML = '';
            const showEditorsValue = config.showEditors != null ? config.showEditors.toString().toLowerCase() : 'null';
            if (['true', 'admin'].includes(showEditorsValue)) {
                if (showEditorsValue === 'true' && config.editors) {
                    editorBtnHTML = this._generateEditorBtnHTML();
                } else if (showEditorsValue === 'admin' && config.editors && this._hasAdminRights()) {
                    editorBtnHTML = this._generateEditorBtnHTML();
                }
            }

            this.content.innerHTML = `
                <style>
                    ha-card {
                        padding: 8px;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    #icon {
                        --mdc-icon-size: 30px;
                        background: hsl(${hue}, ${saturation}%, 25%);
                        color: hsl(${hue}, ${saturation}%, 75%);
                        border-radius: 25px;
                        padding: 4px;
                    }
                    .header span {
                        font-size: 18px;
                        font-weight: bold;
                        margin-left: 8px;
                        flex-grow: 1;
                        text-align: left;
                    }
                    .editor-btn {
                        position: relative;
                        background: none;
                        border: none;
                        cursor: pointer;
                    }
                    .editor-btn:hover ha-icon {
                        filter: brightness(0.8);
                    }
                    .editor-content {
                        display: ${this.editorContentVisible ? 'block' : 'none'};
                        position: absolute;
                        right: 0;
                        background-color: white;
                        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                        z-index: 1;
                        border-radius: 10px;
                        white-space: nowrap;
                    }
                    .editor-btn ha-icon {
                        --mdc-icon-size: 30px;
                    }
                    .editor-content a {
                        color: black;
                        padding: 12px 16px;
                        text-decoration: none;
                        display: block;
                    }
                    .editor-content a:hover {
                        background-color: rgba(0, 0, 0, 0.1);
                        border-radius: 8px;
                    }
                    .control-group, .rider-group {
                        display: flex;
                        justify-content: space-around;
                        margin: 8px 0;
                        flex-wrap: wrap;
                    }
                    .control-btn, .rider-btn {
                        background: none;
                        border: 1px solid #ccc;
                        border-radius: 8px;
                        padding: 8px;
                        cursor: pointer;
                        flex: 1 1 auto;
                        margin: 2px;
                        text-align: center;
                    }
                    .control-btn.active, .rider-btn.active {
                        background-color: #007bff;
                        border-color: #007bff;
                        color: white;
                    }
                    .control-btn:hover, .rider-btn:hover {
                        filter: brightness(0.8);
                    }
                    .slider-header {
                        margin: 8px 0;
                    }
                    .slider-header label {
                        display: flex;
                        justify-content: space-between;
                        font-size: smaller; /* Smaller font size */
                    }
                    .slider-header label span div {
                        display: inline-block;
                        min-width: 100px;
                        text-align: right;
                        padding-right: 6px;
                    }
                    .slider {
                        -webkit-appearance: none;
                        width: calc(100% - 16px); /* Adjusted width to account for padding */
                        height: 30px;
                        background: #d3d3d3;
                        border-radius: 8px;
                        outline: none;
                        cursor: pointer;
                        padding: 4px;
                    }
                    .slider:hover {
                        filter: brightness(0.8);
                    }
                    #lightness-slider {
                        background: linear-gradient(to right, hsl(${hue}, 100%, 0%), hsl(${hue}, 100%, 50%));
                    }
                    #kelvin-slider {
                        background: linear-gradient(to right, rgb(${minKelvin.join(', ')}), rgb(${maxKelvin.join(', ')}));
                    }
                    #hue-slider {
                        background: linear-gradient(to right, ${generateHueGradient()});
                    }
                    #saturation-slider {
                        background: linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%));
                    }
                    #red-slider {
                        background: linear-gradient(to right, rgb(0, 0, 0), rgb(255, 0, 0));
                    }
                    #green-slider {
                        background: linear-gradient(to right, rgb(0, 0, 0), rgb(0, 255, 0));
                    }
                    #blue-slider {
                        background: linear-gradient(to right, rgb(0, 0, 0), rgb(0, 0, 255));
                    }
                    #warm-slider {
                        background: linear-gradient(to right, rgb(0, 0, 0), rgb(${minKelvin.join(', ')}));
                    }
                    #cold-slider {
                        background: linear-gradient(to right, rgb(0, 0, 0), rgb(${maxKelvin.join(', ')}));
                    }
                    .slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 8px;
                        height: 40px;
                        border-radius: 5px;
                        border: 2px solid #444444; /* Darker border color */
                        outline: 2px solid #cccccc; /* Light gray outline color */
                    }
                    .slider::-moz-range-thumb {
                        width: 8px;
                        height: 40px;
                        border-radius: 5px;
                        border: 2px solid #444444; /* Darker border color */
                        outline: 2px solid #cccccc; /* Light gray outline color */
                    }
                </style>
                <div class="header">
                    <ha-icon id="icon" icon="${icon}"></ha-icon>
                    <span>${name}</span>
                    ${editorBtnHTML}
                </div>
                <div class="control-group">
                    <button class="control-btn" id="auto" data-mode="auto" title="Automatically">
                        <ha-icon icon="mdi:lightbulb-auto"></ha-icon>
                    </button>
                    <button class="control-btn" id="on" data-mode="on" title="On">
                        <ha-icon icon="mdi:lightbulb-on"></ha-icon>
                    </button>
                    <button class="control-btn" id="off" data-mode="off" title="Off">
                        <ha-icon icon="mdi:lightbulb-off-outline"></ha-icon>
                    </button>
                </div>
                <div id="lightness" class="slider-header" title="Lightness: ${lightness} bit">
                    <label>Lightness: <span id="lightness-value"><div>${(lightness/2.55).toFixed(2)} %</div><div>${lightness} bit</div></span></label>
                    <input type="range" id="lightness-slider" class="slider" min="1" max="255" value="${lightness}">
                </div>
                <div class="rider-group">
                    <button class="rider-btn" id="color-temp" data-mode="color-temp" title="Color-Temperature">Color Temp</button>
                    <button class="rider-btn" id="HS" data-mode="HS" title="Hue-Saturation-Color">HS-Color</button>
                    <button class="rider-btn" id="HSW" data-mode="HSW" title="Hue-Saturation-White-Color">HSW-Color</button>
                    <button class="rider-btn" id="HSWW" data-mode="HSWW" title="Hue-Saturation-White-White-Color">HSWW-Color</button>
                    <button class="rider-btn" id="RGB" data-mode="RGB" title="Red-Green-Blue-Color">RGB-Color</button>
                    <button class="rider-btn" id="RGBW" data-mode="RGBW" title="Red-Green-Blue-White-Color">RGBW-Color</button>
                    <button class="rider-btn" id="RGBWW" data-mode="RGBWW" title="Red-Green-Blue-White-White-Color">RGBWW-Color</button>
                </div>
                <div id="kelvin" class="slider-header" title="Kelvin: ${kelvin} K">
                    <label>Kelvin: <span id="kelvin-value"><div>${attributes.color_temp ? attributes.color_temp : 0} mired</div><div>${kelvin} Kelvin</div></span></label>
                    <input type="range" id="kelvin-slider" class="slider" min="${minKelvin}" max="${maxKelvin}" value="${kelvin}">
                </div>
                <div id="hue" class="slider-header" title="Hue: ${hue} °">
                    <label>Hue: <span id="hue-value"><div>${hue} °</div></span></label>
                    <input type="range" id="hue-slider" class="slider" min="0" max="360" value="${hue}">
                </div>
                <div id="saturation" class="slider-header" title="Saturation: ${saturation} %">
                    <label>Saturation: <span id="saturation-value"><div>${saturation} %</div></span></label>
                    <input type="range" id="saturation-slider" class="slider" min="0" max="100" value="${saturation}">
                </div>
                <div id="red" class="slider-header" title="Red: ${red} bit">
                    <label>Red: <span id="red-value"><div>${(red/2.55).toFixed(2)}%</div><div>${red} bit</div></span></label>
                    <input type="range" id="red-slider" class="slider" min="0" max="255" value="${red}">
                </div>
                <div id="green" class="slider-header" title="Green: ${green} bit">
                    <label>Green: <span id="green-value"><div>${(green/2.55).toFixed(2)}%</div><div>${green} bit</div></span></label>
                    <input type="range" id="green-slider" class="slider" min="0" max="255" value="${green}">
                </div>
                <div id="blue" class="slider-header" title="Blue: ${blue} bit">
                    <label>Blue: <span id="blue-value"><div>${(blue/2.55).toFixed(2)}%</div><div>${blue} bit</div></span></label>
                    <input type="range" id="blue-slider" class="slider" min="0" max="255" value="${blue}">
                </div>
                <div id="warm" class="slider-header" title="Warm: ${warm} bit">
                    <label>Warm: <span id="warm-value"><div>${(warm/2.55).toFixed(2)}%</div><div>${warm} bit</div></span></label>
                    <input type="range" id="warm-slider" class="slider" min="0" max="255" value="${warm}">
                </div>
                <div id="cold" class="slider-header" title="Cold: ${cold} bit">
                    <label>Cold: <span id="cold-value"><div>${(cold/2.55).toFixed(2)}%</div><div>${cold} bit</div></span></label>
                    <input type="range" id="cold-slider" class="slider" min="0" max="255" value="${cold}">
                </div>
            `;

            this._attachEventListeners();
        } else {
            this.content.innerHTML = `
                <p>Entität nicht gefunden: ${entityId}</p>`;
        }
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('Du musst eine Entität angeben');
        }
        this._config = config;
        this.render(); // Re-render the component when the configuration changes
    }

    getCardSize() {
        return 1;
    }

    _attachEventListeners() {
        const editorButton = this.content.querySelector('#editor-btn');
        if (editorButton) {
            editorButton.addEventListener('click', () => {
                const editorContent = this.content.querySelector('#editor-content');
                this.editorContent.style.display = this.editorContentVisible ? 'none' : 'block';
                this.editorContentVisible = !this.editorContentVisible;
            });
        }

        const controlButtons = this.content.querySelectorAll('.control-group .control-btn');
        controlButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const mode = event.currentTarget.dataset.mode;
                controlButtons.forEach(btn => btn.classList.remove('active'));
                event.currentTarget.classList.add('active');
                // Handle mode change here
            });
        });

        const riderButtons = this.content.querySelectorAll('.rider-group .rider-btn');
        riderButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                if (event.currentTarget.classList.contains('active')) {
                    event.currentTarget.classList.remove('active');
                } else {
                    riderButtons.forEach(btn => btn.classList.remove('active'));
                    event.currentTarget.classList.add('active');
                }
                // Handle mode change here
            });
        });
    }

    _validateIcon(icon) {
        const mdiPattern = /^mdi:[a-z0-9-]+$/;
        return mdiPattern.test(icon) ? icon : null;
    }

    _generateEditorBtnHTML() {
        const editorLinks = this._config.editors.map(editor => {
            const name = editor.name ? editor.name : editor.url;
            return `<a href="${editor.url}">${name}</a>`;
        }).join('');
        return `
            <button class="editor-btn" id="editor-btn" title="Editor-Links">
                <ha-icon icon="mdi:dots-vertical-circle-outline"></ha-icon>
                <div class="editor-content" id="editor-content">
                    ${editorLinks}
                </div>
            </button>`;
    }

    _hasAdminRights() {
        return this._hass.user && this._hass.user.is_admin;
    }
}

function kelvinToRgb(kelvin) {
    let temp = kelvin / 100;
    let red, green, blue;
    if (temp <= 66) {
        red = 255;
        green = 99.4708025861 * Math.log(temp) - 161.1195681661;
        blue = (temp <= 19) ? 0 : (138.5177312231 * Math.log((temp - 10)) - 305.0447927307)
    } else {
        red = 329.698727446 * Math.pow((temp - 60), -0.1332047592);
        green = 288.1221695283 * Math.pow((temp - 60), -0.0755148492);
        blue = 255;
    }
    return [Math.min(255, Math.max(0, red)), Math.min(255, Math.max(0, green)), Math.min(255, Math.max(0, blue))];
}

function generateHueGradient() {
    const colors = [];
    for (let i = 0; i <= 360; i += 10) {
        colors.push(`hsl(${i}, 100%, 50%)`);
    }
    return colors.join(', ');
}

customElements.define('light-card-2025', LightCard2025);