class LightCard2025 extends HTMLElement {
    constructor() {
        super();
        this.editorContentVisible = false;
        this._prevEntity = null;
    }

    set hass(hass) {
        this._hass = hass;

        const entityId = this._config.entity;
        const autoEntityId = this._config.autoEntity;
    
        const stateObj = hass.states[entityId];
        const autoStateObj = autoEntityId ? hass.states[autoEntityId] : null;
    
        if (!stateObj) {
            console.warn(`Entität ${entityId} nicht gefunden.`);
            return;
        }

        const hasEntityChanged = JSON.stringify(stateObj) !== JSON.stringify(this._prevStateObj);
        const hasAutoEntityStateChanged = autoStateObj && autoStateObj.state !== (this._prevAutoEntityState || null);

        if (hasEntityChanged || hasAutoEntityStateChanged) {
            this._prevStateObj = { ...stateObj };
            this._prevAutoEntityState = autoStateObj ? autoStateObj.state : null;
            this.render();
        }
    }

    connectedCallback() {
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
        const autoEntityId = this._config.autoEntity;
        const state = this._hass.states[entityId];
        const autoState = autoEntityId ? this._hass.states[autoEntityId] : null;
        const attributes = state.attributes ? state.attributes : {};
        const config = this._config;

        if (!state) {
            this.content.innerHTML = `
                <p>Entität nicht gefunden: ${entityId}</p>`;
            return;
        }    

        if (state) {
            let validateIcon = this._validateIcon(config.icon); 
            const icon = validateIcon ? validateIcon : attributes.icon ? attributes.icon : 'mdi:lightbulb';
            const name = config.name ? config.name : attributes.friendly_name ? attributes.friendly_name : entityId;
            validateIcon = this._validateIcon(config.autoButtonIcon);
            const autoButtonIcon = validateIcon ? validateIcon : 'mdi:lightbulb-auto';
            validateIcon = this._validateIcon(config.onButtonIcon);
            const onButtonIcon = validateIcon ? validateIcon : 'mdi:lightbulb-on';
            validateIcon = this._validateIcon(config.offButtonIcon);
            const offButtonIcon = validateIcon ? validateIcon : 'mdi:lightbulb-off-outline';

            const isLightEntity = entityId.startsWith('light.');
            const brightness = attributes.brightness ? attributes.brightness : 1;
            const hue = attributes.hs_color ? attributes.hs_color[0].toFixed(0) : 0;
            const saturation = attributes.hs_color ? attributes.hs_color[1].toFixed(2) : 0;
            const kelvin = attributes.color_temp_kelvin ? attributes.color_temp_kelvin : 2000;
            const minKelvin = kelvinToRgb(attributes.min_color_temp_kelvin ? attributes.min_color_temp_kelvin : 2000);
            const maxKelvin = kelvinToRgb(attributes.max_color_temp_kelvin ? attributes.max_color_temp_kelvin : 6500);

            let red = 0, green = 0, blue = 0, warm = 0, cold = 0;
            if (attributes.rgbww_color) {
                [red, green, blue, warm, cold] = attributes.rgbww_color;
            } else if (attributes.rgbw_color) {
                [red, green, blue, warm] = attributes.rgbw_color;
            } else if (attributes.rgb_color) {
                [red, green, blue] = attributes.rgb_color;
            }

            let editorBtnHTML = '';
            const showEditorsValue = config.showEditors != null ? config.showEditors.toString().toLowerCase() : 'null';
            if (['true', 'admin'].includes(showEditorsValue)) {
                if (showEditorsValue === 'true' && config.editors) {
                    editorBtnHTML = this._generateEditorBtnHTML();
                } else if (showEditorsValue === 'admin' && config.editors && this._hasAdminRights()) {
                    editorBtnHTML = this._generateEditorBtnHTML();
                }
            }

            const isEntityOn = state.state === 'on';
            const isAutoEntityOn = autoState && autoState.state === 'on';
            const autoButtonClass = isAutoEntityOn ? 'active' : '';
            const onButtonClass = !isAutoEntityOn && isEntityOn ? 'active' : '';
            const offButtonClass = !isAutoEntityOn && !isEntityOn ? 'active' : '';


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
                        display: ${config.showIcon ? 'block' : 'none'};
                        --mdc-icon-size: 30px;
                        background: hsl(${hue}, ${saturation}%, 25%);
                        color: hsl(${hue}, ${saturation}%, 75%);
                        border-radius: 25px;
                        padding: 4px;
                    }
                    .header span {
                        display: ${config.showName ? 'block' : 'none'};
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
                        margin-left: auto;
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
                    #auto {
                        background-color: ${config.autoButtonColor};
                    }  
                    #auto.active {
                        background-color: ${config.autoButtonActiveColor};
                    }  
                    #on {
                        background-color: ${config.autoButtonColor};
                    }  
                    #on.active {
                        background-color: ${config.autoButtonActiveColor};
                    }  
                    #off {
                        background-color: ${config.autoButtonColor};
                    }  
                    #off.active {
                        background-color: ${config.autoButtonActiveColor};
                    }  
                    .rider-btn {
                        background: ${config.riderButtonColor};
                    }   
                    .rider-btn.active {
                        background-color: ${config.riderButtonActiveColor};
                    }
                    .control-btn:hover, .rider-btn:hover {
                        filter: brightness(0.8);
                    }
                    .slider-header {
                        margin: 8px 0;
                    }
                    .slider-header label {
                        display: ${config.showSliderLabels ? 'flex' : 'none'};
                        justify-content: space-between;
                        font-size: smaller; 
                    }
                    .slider-header label span {
                        display: ${config.showSliderValues ? 'block' : 'none'};
                    }
                    .slider-header label span div {
                        display: inline-block;
                        min-width: 100px;
                        text-align: right;
                        padding-right: 6px;
                    }
                    .slider {
                        -webkit-appearance: none;
                        width: calc(100% - 16px); 
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
                    #brightness-slider {
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
                    ${config.showAutoButton && autoState ? `
                    <button class="control-btn ${autoButtonClass}" id="auto" data-mode="auto" title="Automatisch">
                        <ha-icon icon="${autoButtonIcon}"></ha-icon>
                    </button>` : ''}
                    ${config.showOnButton ? `
                    <button class="control-btn ${onButtonClass}" id="on" data-mode="on" title="An">
                        <ha-icon icon="${onButtonIcon}"></ha-icon>
                    </button>` : ''}
                    ${config.showOffButton ? `
                    <button class="control-btn ${offButtonClass}" id="off" data-mode="off" title="Aus">
                        <ha-icon icon="${offButtonIcon}"></ha-icon>
                    </button>` : ''}
                </div>
                <div id="brightness" class="slider-header" title="Helligkeit: ${brightness} bit">
                    <label>Helligkeit: <span id="brightness-value"><div>${(brightness/2.55).toFixed(2)} %</div><div>${brightness} bit</div></span></label>
                    <input type="range" id="brightness-slider" class="slider" min="1" max="255" value="${brightness}">
                </div>
                <div class="rider-group">
                    <button class="rider-btn" id="color-temp" data-mode="color-temp" title="Farbe-Temperatur">Farbe-Temp</button>
                    <button class="rider-btn" id="HS" data-mode="HS" title="Farbton-Sättigung-Farbe">HS-Farbe</button>
                    <button class="rider-btn" id="HSW" data-mode="HSW" title="Farbton-Sättigung-Weiß-Farbe">HSW-Farbe</button>
                    <button class="rider-btn" id="HSWW" data-mode="HSWW" title="Farbton-Sättigung-Weiß-Weiß-Farbe">HSWW-Farbe</button>
                    <button class="rider-btn" id="RGB" data-mode="RGB" title="Rot-Grün-Blau-Farbe">RGB-Farbe</button>
                    <button class="rider-btn" id="RGBW" data-mode="RGBW" title="Rot-Grün-Blau-Weiß-Farbe">RGBW-Farbe</button>
                    <button class="rider-btn" id="RGBWW" data-mode="RGBWW" title="Rot-Grün-Blau-Weiß-Weiß-Farbe">RGBWW-Farbe</button>
                </div>
                <div id="kelvin" class="slider-header" title="Farbe-Temperatur: ${kelvin} K">
                    <label>Farbe-Temperatur: <span id="kelvin-value"><div>${attributes.color_temp ? attributes.color_temp : 0} mired</div><div>${kelvin} Kelvin</div></span></label>
                    <input type="range" id="kelvin-slider" class="slider" min="${minKelvin}" max="${maxKelvin}" value="${kelvin}">
                </div>
                <div id="hue" class="slider-header" title="Farbton: ${hue} °">
                    <label>Farbton: <span id="hue-value"><div>${hue} °</div></span></label>
                    <input type="range" id="hue-slider" class="slider" min="0" max="360" value="${hue}">
                </div>
                <div id="saturation" class="slider-header" title="Sättigung: ${saturation} %">
                    <label>Sättigung: <span id="saturation-value"><div>${saturation} %</div></span></label>
                    <input type="range" id="saturation-slider" class="slider" min="0" max="100" value="${saturation}">
                </div>
                <div id="red" class="slider-header" title="Rot: ${red} bit">
                    <label>Rot: <span id="red-value"><div>${(red/2.55).toFixed(2)}%</div><div>${red} bit</div></span></label>
                    <input type="range" id="red-slider" class="slider" min="0" max="255" value="${red}">
                </div>
                <div id="green" class="slider-header" title="Grün: ${green} bit">
                    <label>Grün: <span id="green-value"><div>${(green/2.55).toFixed(2)}%</div><div>${green} bit</div></span></label>
                    <input type="range" id="green-slider" class="slider" min="0" max="255" value="${green}">
                </div>
                <div id="blue" class="slider-header" title="Blau: ${blue} bit">
                    <label>Blau: <span id="blue-value"><div>${(blue/2.55).toFixed(2)}%</div><div>${blue} bit</div></span></label>
                    <input type="range" id="blue-slider" class="slider" min="0" max="255" value="${blue}">
                </div>
                <div id="warm" class="slider-header" title="Warmweiß: ${warm} bit">
                    <label>Warmweiß: <span id="warm-value"><div>${(warm/2.55).toFixed(2)}%</div><div>${warm} bit</div></span></label>
                    <input type="range" id="warm-slider" class="slider" min="0" max="255" value="${warm}">
                </div>
                <div id="cold" class="slider-header" title="Kaltweiß: ${cold} bit">
                    <label>Kaltweiß: <span id="cold-value"><div>${(cold/2.55).toFixed(2)}%</div><div>${cold} bit</div></span></label>
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
        if (!config.entity) { throw new Error('Du musst eine Entität (light.* oder switch.*) angeben'); }
    
        if (!config.entity.startsWith('light.') && !config.entity.startsWith('switch.')) { throw new Error('Die Entität muss entweder eine Licht-Entität (light.*) oder eine Schalter-Entität (switch.*) sein. Bitte überprüfe deine Konfiguration.'); }    
        
        if (config.autoEntity && !config.autoEntity.startsWith('automation.')) { throw new Error('Die optionale Entität autoEntity muss eine Automatisierungs-Entität sein (automation.*)'); }    

        if (config.autoButtonColor && !this._validateCssColor(config.autoButtonColor)) { throw new Error('Die angegebene Farbe für autoButtonColor ist nicht CSS-kompatibel'); }
        if (config.autoButtonActiveColor && !this._validateCssColor(config.autoButtonActiveColor)) { throw new Error('Die angegebene Farbe für autoButtonActiveColor ist nicht CSS-kompatibel'); }
        if (config.onButtonColor && !this._validateCssColor(config.onButtonColor)) { throw new Error('Die angegebene Farbe für onButtonColor ist nicht CSS-kompatibel'); }
        if (config.onButtonActiveColor && !this._validateCssColor(config.onButtonActiveColor)) { throw new Error('Die angegebene Farbe für onButtonActiveColor ist nicht CSS-kompatibel'); }
        if (config.offButtonColor && !this._validateCssColor(config.offButtonColor)) { throw new Error('Die angegebene Farbe für offButtonColor ist nicht CSS-kompatibel'); }
        if (config.offButtonActiveColor && !this._validateCssColor(config.offButtonActiveColor)) { throw new Error('Die angegebene Farbe für offButtonActiveColor ist nicht CSS-kompatibel'); }
        if (config.riderButtonColor && !this._validateCssColor(config.riderButtonColor)) { throw new Error('Die angegebene Farbe für riderButtonColor ist nicht CSS-kompatibel'); }
        if (config.riderButtonActiveColor && !this._validateCssColor(config.riderButtonActiveColor)) { throw new Error('Die angegebene Farbe für riderButtonActiveColor ist nicht CSS-kompatibel'); }
    
        this._config = {
            showIcon: true,
            showName: true,
            showEditors: 'admin',
            showAutoButton: true,
            showOnButton: true,
            showOffButton: true,
            autoButtonColor: 'transparent',
            autoButtonActiveColor: '#007bff',
            onButtonColor: 'transparent',
            onButtonActiveColor: '#007bff',
            offButtonColor: 'transparent',
            offButtonActiveColor: '#007bff',
            riderButtonColor: 'transparent',
            riderButtonActiveColor: '#007bff',
            showSliderLabels: true,
            showSliderValues: true,
            ...config
        };
        this.render();
    }

    getCardSize() {
        return 1;
    }

    _attachEventListeners() {
        const isLightEntity = this._config.entity.startsWith('light.');
        const editorButton = this.content.querySelector('#editor-btn');
        if (editorButton) {
            editorButton.addEventListener('click', () => {
                const editorContent = this.content.querySelector('#editor-content');
                if (editorContent) {
                    editorContent.style.display = this.editorContentVisible ? 'none' : 'block';
                    this.editorContentVisible = !this.editorContentVisible;
                }
            });
        }

        const controlButtons = this.content.querySelectorAll('.control-group .control-btn');
        controlButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const mode = event.currentTarget.dataset.mode;
                controlButtons.forEach(btn => btn.classList.remove('active'));
                event.currentTarget.classList.add('active');
                const entityId = this._config.entity;
                const autoEntityId = this._config.autoEntity;
                if (mode === 'auto') {
                    if (autoEntityId) {
                        this._hass.callService('automation', 'turn_on', { entity_id: autoEntityId })
                            .catch(err => console.error(`Fehler beim Einschalten der Automatisierung (${autoEntityId}):`, err));
                    }
                } else if (mode === 'on') {
                    if (autoEntityId) {
                        this._hass.callService('automation', 'turn_off', { entity_id: autoEntityId })
                            .catch(err => console.error(`Fehler beim Ausschalten der Automatisierung (${autoEntityId}):`, err));
                    }
                    this._hass.callService(isLightEntity ? 'light' : 'switch', 'turn_on', { entity_id: entityId })
                        .catch(err => console.error(`Fehler beim Einschalten der Entität (${entityId}):`, err));
                } else if (mode === 'off') {
                    if (autoEntityId) {
                        this._hass.callService('automation', 'turn_off', { entity_id: autoEntityId })
                            .catch(err => console.error(`Fehler beim Ausschalten der Automatisierung (${autoEntityId}):`, err));
                    }
                    this._hass.callService(isLightEntity ? 'light' : 'switch', 'turn_off', { entity_id: entityId })
                        .catch(err => console.error(`Fehler beim Ausschalten der Entität (${entityId}):`, err));
                }
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

    _validateCssColor(color) {
        const s = new Option().style;
        s.color = color;
        if (s.color === '') {
            console.warn(`Ungültige CSS-Farbe: ${color}`);
            return false;
        }
        return true;
    }

    _generateEditorBtnHTML() {
        const validateIcon = this._validateIcon(this._config.editorButtonIcon);
        const editorButtonIcon = validateIcon ? validateIcon : 'mdi:dots-vertical-circle-outline';

        const editorLinks = this._config.editors.map(editor => {
            const name = editor.name ? editor.name : editor.url;
            return `<a href="${editor.url}">${name}</a>`;
        }).join('');

        return `
            <button class="editor-btn" id="editor-btn" title="Editor-Links">
                <ha-icon icon="${editorButtonIcon}"></ha-icon>
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
    kelvin = Math.max(1000, Math.min(40000, kelvin));
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
    return Array.from({ length: 37 }, (_, i) => `hsl(${i * 10}, 100%, 50%)`).join(', ');
}

customElements.define('light-card-2025', LightCard2025);