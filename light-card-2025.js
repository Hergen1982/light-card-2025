class LightCard2025 extends HTMLElement {
    constructor() {
        super();
        this.menuVisible = false;
        this.tabButtonActive = '';
        this._previousState = null;
        this._previousAttributes = null;
        this._previousAutoState = null;
        this._previousConfig = null;
        this.forceUpdate = false;
    }
    
    set hass(hass) {
        this._hass = hass;
        const state = hass.states[this.config.entity];
        if (!state) {
            this.content.innerHTML = `
                <span class="error">Die Entität <b>${this.config.entity}</b> ist nicht verfügbar. Bitte überprüfe die Konfiguration.</span>
            `;
            return;
        }

        this.domain = this.config.entity.split('.')[0];
        if (!['light', 'switch'].includes(this.domain)) {
            this.content.innerHTML = `
                <span class="error">Die Domain der Entität <b>${this.config.entity}</b> kann nicht verarbeitet werden. Bitte überprüfe die Konfiguration.</span>
            `;
            return;
        }

        const attributes = state.attributes ? state.attributes : {};
        const autoState = this.config.autoEntity ? hass.states[this.config.autoEntity] : null;
        const automationsId = autoState.attributes && autoState.attributes.id ? autoState.attributes.id : null
        const haveStateChanged = this._previousState !== state.state;
        const haveAttributesChanged = this._previousAttributes !== attributes;
        const haveAutoStateChanged = this._previousAutoState !== autoState;
        const haveConfigChanged = this._previousConfig !== this.config;
        if (!haveStateChanged && !haveAttributesChanged && !haveAutoStateChanged && !haveConfigChanged && !this.forceUpdate) {
            return;
        }
        
        this._previousState = state.state;
        this._previousAttributes = attributes;
        this._previousAutoState = autoState;
        this._previousConfig = this.config;
        this.forceUpdate = false;
        this.isAdmin = this._hass.user.is_admin
        const iconsDict = {
            'light': {'on': 'mdi:lightbulb-on', 'off': 'mdi:lightbulb-off', 'auto': 'mdi:lightbulb-auto'},
            'switch': {'on': 'mdi:toggle-switch', 'off': 'mdi:toggle-switch-off', 'auto': 'mdi:flash-auto'}
        };
        if (!this.content) {
            const card = document.createElement('ha-card');
            this.content = document.createElement('div');
            card.appendChild(this.content);
            this.appendChild(card);
            const scriptPath = new URL(import.meta.url).pathname;
            const cssPath = scriptPath.replace('.js', '.css');
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            this.appendChild(link);
        }

        const hasAuto = autoState !== null ? true: false;
        const isAuto = autoState && autoState.state == 'on' ? true : false;
        const isOn = state.state === 'on' ? true : false;
        const isOff = state.state === 'off' ? true : false;
        let isUnknown = true;
        if (this.domain === "light" && (state.state === 'on' || state.state === 'off')) { isUnknown = false; }
        if (this.domain === "switch" && (state.state === 'on' || state.state === 'off')) { isUnknown = false; }
        let icon = 'mdi:alert-circle-outline';
        if (isOn) {
            icon = this.iconActive ? this.iconActive : this.icon ? this.icon : iconsDict[this.domain].on; 
        } else if (isOff) {
            icon = this.icon ? this.icon : iconsDict[this.domain].off;
        }
        const name = this.name ? this.name : attributes.friendly_name ? attributes.friendly_name : this.config.entity;
        const onIconButton = this.onButtonIcon ? this.onButtonIcon : iconsDict[this.domain].on;
        const offIconButton = this.offButtonIcon ? this.offButtonIcon : iconsDict[this.domain].off;
        const autoIconButton = this.autoButtonIcon ? this.autoButtonIcon : iconsDict[this.domain].auto;
        
        const colorModes = attributes.supported_color_modes ? attributes.supported_color_modes : []
        const hasBrightness = 'brightness' in attributes;
        const hasColorTemp = 'color_temp' in attributes;
        const hasRgbColor = 'rgb_color' in attributes && ['hs', 'rgb'].some(mode => colorModes.includes(mode))
        const hasRgbwColor = 'rgbw_color' in attributes
        const hasRgbwwColor = 'rgbww_color' in attributes
        const brightness = attributes.brightness ? attributes.brightness : (isOn ? 1 : 0);
        const lightness = hasBrightness ? (brightness / 4) + 10 : 75;
        const colorTemp = attributes.color_temp ? attributes.color_temp : 500;
        const colorTempKelvin = attributes.color_temp_kelvin ? attributes.color_temp_kelvin : 2000;
        const minColorTemp = attributes.min_color_temp ? attributes.minColorTemp : 153;
        const minColorTempKelvin = attributes.min_color_temp_kelvin ? attributes.min_color_temp_kelvin : 2000;
        const maxColorTemp = attributes.max_color_temp ? attributes.max_color_temp : 500;
        const maxColorTempKelvin = attributes.max_color_temp_kelvin ? attributes.max_color_temp_kelvin : 6500;
        const hue = attributes.hs_color ? attributes.hs_color[0].toFixed(0): 30;
        const saturation = attributes.hs_color ? attributes.hs_color[1].toFixed(2): 100;
        let red = 0, green = 0, blue = 0, warm = 0, cold = 0
        if (attributes.rgbww_color) {
            [red, green, blue, warm, cold] = attributes.rgbww_color;
        } else if (attributes.rgbw_color) {
            [red, green, blue, warm] = attributes.rgbw_color;
        } else if (attributes.rgb_color) {
            [red, green, blue] = attributes.rgb_color;
        }
        const minColor = miredToRgb(minColorTemp);
        const maxColor = miredToRgb(maxColorTemp);
        const kelvinMinColor = kelvinToRgb(minColorTempKelvin);
        const kelvinMaxColor = kelvinToRgb(maxColorTempKelvin);
        this.hasValue = {brightness: hasBrightness, colorTemp: hasColorTemp,  rgbColor: hasRgbColor, rgbwColor: hasRgbwColor, rgbwwColor: hasRgbwwColor};
        this.colorValue = {hue: hue, saturation: saturation, red: red, green: green, blue: blue, warm: warm, cold: cold};

        const styles = this.content.style;
        styles.setProperty('filter', isUnknown ? 'grayscale(100%)' : 'none');
        if (this.domain === "light" ) {
            if (!this.isSetIconActiveColor) {styles.setProperty('--icon-active-color', `hsl(${hue}, ${saturation}%, ${lightness}%)`);}
            if (!this.isSetIconActiveBackground) {styles.setProperty('--icon-active-background', `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)`);}
            if (!this.isSetSliderBackgroundBrightness) {styles.setProperty('--slider-brightness-background', `linear-gradient(to right, hsl(${hue}, 100%, 0%), hsl(${hue}, 100%, 50%))`);}
            if (!this.isSetSliderBackgroundColorTemp) {styles.setProperty('--slider-color-temp-background', `linear-gradient(to right, rgb(${minColor}), rgb(${maxColor}))`);}
            if (!this.isSetSliderBackgroundColorTempKelvin) {styles.setProperty('--slider-color-temp-kelvin-background', `linear-gradient(to right, rgb(${kelvinMinColor}), rgb(${kelvinMaxColor}))`);}
            if (!this.isSetSliderBackgroundSaturation) {styles.setProperty('--slider-saturation-background', `linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))`);}
            if (!this.isSetSliderBackgroundWarmWhite) {styles.setProperty('--slider-warm-white-background', `linear-gradient(to right, rgb(0, 0, 0), rgb(${kelvinMinColor}))`);}
            if (!this.isSetSliderBackgroundColdWhite) {styles.setProperty('--slider-cold-white-background', `linear-gradient(to right, rgb(0, 0, 0), rgb(${kelvinMaxColor}))`);}
        }

        this.content.innerHTML = `
            <div id="header" ${isOn ? `class="active"`: ''}>
                ${this.showIcon ? `<ha-icon id="icon" class="show_more_info" icon="${icon}"></ha-icon>` : ''}
                ${this.showName ? `<span id="name" class="show_more_info">${name}</span>` : ''}
                ${this.showMenu && (this.showMenuAdminOnly ? this.isAdmin : true) ? `
                    <button id="menu" title="${this.nameMenuButtonTitle}">
                        <ha-icon id="menu-icon" icon="mdi:menu"></ha-icon>
                        <div id="menu-content" style="display: ${this.menuVisible ? 'block' : 'none'};">
                            ${this.showMoreInfo && (this.showMoreInfoAdminOnly ? this.isAdmin : true) ? `<a href="#" class="show_more_info">Mehr Infos anzeigen</a>` : '' }
                            ${this.showLogbook && (this.showLogbookAdminOnly ? this.isAdmin : true) ? `<a href="/logbook?entity_id=${this.config.entity}">Logbuch anzeigen</a>` : '' }
                            ${this.showHistory && (this.showHistoryAdminOnly ? this.isAdmin : true) ? `<a href="/history?entity_id=${this.config.entity}">Verlauf anzeigen</a>` : '' }
                            ${automationsId && this.showAutomationsEditor && (this.showAutomationsEditorAdminOnly ? this.isAdmin : true) ? `<a href="/config/automation/edit/${automationsId}">Automation Bearbeiten</a>` : '' }
                            ${this.menuLinks
                                .filter(link => !link.adminOnly || (link.adminOnly && this.isAdmin))
                                .map(link => `<a href="${link.url}">${link.name}</a>`)
                                .join('')}
                        </div>
                    </button>
                ` : ''}
            </div>
            ${this.showControlButtons ? `
                <div id="control">
                    ${this.showAutoButton && hasAuto ? controlButtonHtml('auto', this.nameAutoButtonTitle, autoIconButton, isAuto) : ''}  
                    ${this.showOnButton ? controlButtonHtml('on', this.nameOnButtonTitle, onIconButton, !isAuto && isOn) : ''}
                    ${this.showOffButton ? controlButtonHtml('off', this.nameOffButtonTitle, offIconButton, !isAuto && isOff) : ''}
                </div>
            ` : ''}
            ${this.showBrightnessSlider && !isAuto && hasBrightness ? sliderHtml('brightness', `${this.nameBrightnessLabel}: ${brightness}`, this.nameBrightnessLabel, brightness, `${(brightness / 2.55).toFixed(2)} %`, brightness, 1, 255, 1, 5, 'mdi:minus', 'mdi:plus', this) : ''}
            ${this.showTabButtons && !isAuto && (hasRgbColor || hasRgbwColor || hasRgbwwColor) ? `
                <div id="tab">
                    ${this.showTabButtonColorTemp && hasColorTemp ? tabButtonHtml("color-temp", this.nameColorTempTabTitle, this.nameColorTempTab, this.tabButtonActive === 'color-temp' ? true : false) : ''}
                    ${this.showTabButtonHsColor && hasRgbColor ? tabButtonHtml("hs", this.nameHsTabTitle, this.nameHsTab, this.tabButtonActive === 'hs' ? true : false) : ''}
                    ${this.showTabButtonHsColor && hasRgbwColor ? tabButtonHtml("hsw", this.nameHswTabTitle, this.nameHswTab, this.tabButtonActive === 'hsw' ? true : false) : ''}
                    ${this.showTabButtonHsColor && hasRgbwwColor ? tabButtonHtml("hsww", this.nameHswwTabTitle, this.nameHswwTab, this.tabButtonActive === 'hsww' ? true : false) : ''}
                    ${this.showTabButtonRgbColor && hasRgbColor ? tabButtonHtml("rgb", this.nameRgbTabTitle, this.nameRgbTab, this.tabButtonActive === 'rgb' ? true : false) : ''}
                    ${this.showTabButtonRgbColor && hasRgbwColor ? tabButtonHtml("rgbw", this.nameRgbwTabTitle, this.nameRgbwTab, this.tabButtonActive === 'rgbw' ? true : false) : ''}
                    ${this.showTabButtonRgbColor && hasRgbwwColor ? tabButtonHtml("rgbww", this.nameRgbwwTabTitle, this.nameRgbwwTab, this.tabButtonActive === 'rgbww' ? true : false) : ''}
                </div>
                ` : '' }
            ${this.showColorTempSlider && !isAuto && hasColorTemp ? sliderHtml('color-temp', `${this.nameColorTempLabel}: ${colorTemp} mired`, `${this.nameColorTempLabel} (mired):`, `${colorTemp} Mired`, `${colorTempKelvin} Kelvin`, colorTemp, minColorTemp, maxColorTemp, 1, 10, 'mdi:minus', 'mdi:plus', this, (hasRgbColor || hasRgbwColor || hasRgbwwColor) && this.tabButtonActive !== 'color-temp' ? true : false) : ''}
            ${this.showColorTempKelvinSlider && !isAuto && hasColorTemp ? sliderHtml('color-temp-kelvin', `${this.nameColorTempLabel}: ${colorTempKelvin} K`, `${this.nameColorTempLabel} (Kelvin):`, `${colorTempKelvin} Kelvin`, `${colorTemp} mired`, colorTempKelvin, minColorTempKelvin, maxColorTempKelvin, 1, 50, 'mdi:minus', 'mdi:plus', this, (hasRgbColor || hasRgbwColor || hasRgbwwColor) && this.tabButtonActive !== 'color-temp' ? true : false) : ''}
            ${this.showHueSlider && !isAuto && (hasRgbColor || hasRgbwColor || hasRgbwwColor) ? sliderHtml('hue', `${this.nameHueLabel}: ${hue} °`, this.nameHueLabel, `${hue} °`, '', hue, 0, 360, 0.1, 15, 'mdi:minus', 'mdi:plus', this, ['hs', 'hsw', 'hsww'].includes(this.tabButtonActive) ? false : true) : ''}
            ${this.showSaturationSlider && !isAuto && (hasRgbColor || hasRgbwColor || hasRgbwwColor) ? sliderHtml('saturation', `${this.nameSaturationLabel}: ${saturation} %`, this.nameSaturationLabel, `${saturation} %`, '', saturation, 0, 100, 0.1, 5, 'mdi:minus', 'mdi:plus', this, ['hs', 'hsw', 'hsww'].includes(this.tabButtonActive) ? false : true) : ''}
            ${this.showRedSlider && !isAuto && (hasRgbColor || hasRgbwColor || hasRgbwwColor) ? sliderHtml('red', `${this.nameRedLabel}: ${red}`, this.nameRedLabel, red, `${(red / 2.55).toFixed(2)} %`, red, 0, 255, 1, 5, 'mdi:minus', 'mdi:plus', this, ['rgb', 'rgbw', 'rgbww'].includes(this.tabButtonActive) ? false : true) : ''}
            ${this.showGreenSlider && !isAuto && (hasRgbColor || hasRgbwColor || hasRgbwwColor) ? sliderHtml('green', `${this.nameGreenLabel}: ${green}`, this.nameGreenLabel, green, `${(green / 2.55).toFixed(2)} %`, green, 0, 255, 1, 5, 'mdi:minus', 'mdi:plus', this, ['rgb', 'rgbw', 'rgbww'].includes(this.tabButtonActive) ? false : true) : ''}
            ${this.showBlueSlider && !isAuto && (hasRgbColor || hasRgbwColor || hasRgbwwColor) ? sliderHtml('blue', `${this.nameBlueLabel}: ${blue}`, this.nameBlueLabel, blue, `${(blue / 2.55).toFixed(2)} %`, blue, 0, 255, 1, 5, 'mdi:minus', 'mdi:plus', this, ['rgb', 'rgbw', 'rgbww'].includes(this.tabButtonActive) ? false : true) : ''}
            ${this.showWhiteSlider && !isAuto && hasRgbwColor ? sliderHtml('white', `${this.nameWhiteLabel}: ${warm}`, this.nameWhiteLabel, warm, `${(warm / 2.55).toFixed(2)} %`, warm, 0, 255, 1, 5, 'mdi:minus', 'mdi:plus', this, ['hsw', 'rgbw'].includes(this.tabButtonActive) ? false : true) : ''}
            ${this.showWarmWhiteSlider && !isAuto && hasRgbwwColor ? sliderHtml('warm-white', `${this.nameWarmWhiteLabel}: ${warm}`, this.nameWarmWhiteLabel, warm, `${(warm / 2.55).toFixed(2)} %`, warm, 0, 255, 1, 5, 'mdi:minus', 'mdi:plus', this, ['hsww', 'rgbww'].includes(this.tabButtonActive) ? false : true) : ''}
            ${this.showColdWhiteSlider && !isAuto && hasRgbwwColor ? sliderHtml('cold-white', `${this.nameColdWhiteLabel}: ${cold}`, this.nameColdWhiteLabel, cold, `${(cold / 2.55).toFixed(2)} %`, cold, 0, 255, 1, 5, 'mdi:minus', 'mdi:plus', this, ['hsww', 'rgbww'].includes(this.tabButtonActive) ? false : true) : ''}
        `;

        const moreInfoLinks = this.content.querySelectorAll('.show_more_info');
        if (this.showMoreInfo && (this.showMoreInfoAdminOnly ? this.isAdmin : true) && moreInfoLinks) {
            moreInfoLinks.forEach(link => {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    showMoreInfo(this.config.entity, this)
                });
            });
        }

        const menuButton = this.content.querySelector('#menu');
        const menuContent = this.content.querySelector('#menu-content');
        if (menuButton) {
            menuButton.addEventListener('click', () => {
                this.menuVisible = !this.menuVisible;
                menuContent.style.display = this.menuVisible ? 'block' : 'none';
            });
        }

        const controlButtons = this.content.querySelectorAll('.control-button');
        if (controlButtons) {
            controlButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (button.getAttribute('data-mode') === 'auto') {
                        this.tabButtonActive = '';
                    }
                    handleControlButtons(
                        button.getAttribute('data-mode'), 
                        this.config,
                        this.domain,
                        (domain, service, data) => callService(this._hass, domain, service, data)
                    );
                });
            });
        }

        const tabButtons = this.content.querySelectorAll('.tab-button');
        if (tabButtons) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (this.tabButtonActive === button.getAttribute('data-mode')) {
                        this.tabButtonActive = '';
                    } else {
                        this.tabButtonActive = button.getAttribute('data-mode');
                    }
                    this.forceUpdate = true;
                    this.setConfig(this.config);
                    this.hass = this._hass;
                });
            });
        }

        const sliders = this.content.querySelectorAll('.slider');
        if (sliders) {
            sliders.forEach(slider => {
                const sliderContainer = slider.closest('.slider-container');
                const valueCircle = this.content.querySelector(`#${slider.id.replace('-slider', '')}-value-circle`);
                slider.addEventListener('change', (event) => {
                    handleSliederChange(
                        event.target.id.replace('-slider', ''), 
                        event.target.value,
                        this.config,
                        this.colorValue,
                        this.hasValue,
                        (domain, service, data) => callService(this._hass, domain, service, data)
                    );
                });
                slider.addEventListener('input', (event) => {
                    if (valueCircle) {
                        updateValueCirclePosition(event.target, valueCircle)
                    }
                });
                ['mousedown', 'touchstart'].forEach(eventType => {
                    slider.addEventListener(eventType, (event) => {
                        sliderContainer.classList.add('active');
                        if (valueCircle) {
                            updateValueCirclePosition(event.target, valueCircle)
                        }
                    })
                });
                ['mouseup', 'touchend'].forEach(eventType => { 
                    slider.addEventListener(eventType, () => {
                        sliderContainer.classList.remove('active');
                    })
                });
            });
        }

        const sliderButtons = this.content.querySelectorAll('.slider-button');
        if (sliderButtons) {
            sliderButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    handleSliederChange(
                        button.id.replace(/-(less|more)-button$/, ''), 
                        button.getAttribute('data-mode'),
                        this.config,
                        this.colorValue,
                        this.hasValue,
                        (domain, service, data) => callService(this._hass, domain, service, data)
                    );
                });
            });
        }
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error("Du musst eine Entität definieren.");
        }
        if (!config.entity.startsWith('light.') && !config.entity.startsWith('switch.')) {
            throw new Error("Die Entität muss vom Typ 'light.' oder 'switch.' sein.");
        }
        if (config.autoEntity && !config.autoEntity.startsWith('automation.')) {
            throw new Error("Die optionale Entität 'autoEntity' muss vom Typ 'automation.' sein.");
        }
        this.config = config;
        const iconlist = ['icon', 'iconActive', 'autoButtonIcon', 'onButtonIcon', 'offButtonIcon'];
        iconlist.forEach((icon) => {
            this[icon] = config[icon] && isValidIcon(config[icon]) ? config[icon] : null;
        });
        this.name = config.name ? config.name : null
        this.isSetIconActiveBackground = config.styles && config.styles.icon && config.styles.icon.active && config.styles.icon.active.background !== undefined ? true : false;
        this.isSetIconActiveColor = config.styles && config.styles.icon && config.styles.icon.active && config.styles.icon.active.color !== undefined ? true : false;
        this.isSetSliderBackgroundBrightness = config.styles && config.styles.sliders && config.styles.sliders.brightness && config.styles.sliders.brightness.background !== undefined ? true : false;
        this.isSetSliderBackgroundColorTemp = config.styles && config.styles.sliders && config.styles.sliders['color-temp'] && config.styles.sliders['color-temp'].background !== undefined ? true : false;
        this.isSetSliderBackgroundColorTempKelvin = config.styles && config.styles.sliders && config.styles.sliders['color-temp-kelvin'] && config.styles.sliders['color-temp-kelvin'].background !== undefined ? true : false;
        this.isSetSliderBackgroundSaturation = config.styles && config.styles.sliders && config.styles.sliders.saturation && config.styles.sliders.saturation.background !== undefined ? true : false;
        this.isSetSliderBackgroundWarmWhite = config.styles && config.styles.sliders && config.styles.sliders['warm-white'] && config.styles.sliders['warm-white'].background !== undefined ? true : false;
        this.isSetSliderBackgroundColdWhite = config.styles && config.styles.sliders && config.styles.sliders['cold-white'] && config.styles.sliders['cold-white'].background !== undefined ? true : false;
        this.showColorTempSlider = config.showColorTempSlider === true ? true : false;
        let attributeList = ['showIcon', 'showName', 'showControlButtons', 'showAutoButton', 'showOnButton', 'showOffButton', 'showMoreAndLessButtons', 'showBrightnessSlider', 'showColorTempKelvinSlider', 'showHueSlider', 'showSaturationSlider', 'showRedSlider', 'showGreenSlider', 'showBlueSlider', 'showWhiteSlider', 'showWarmWhiteSlider', 'showColdWhiteSlider', 'showTabButtons', 'showTabButtonColorTemp', 'showTabButtonHsColor','showTabButtonRgbColor'];
        attributeList.forEach((attribute) => {
            this[attribute] = config[attribute] === false ? false: true;
        });
        attributeList = ['showMenu', 'showLabels', 'showLabelValues', 'showMoreInfo', 'showLogbook', 'showHistory', 'showAutomationsEditor'];
        attributeList.forEach((attribute) => {
            this[attribute] = config[attribute] === 'admin' ? true : config[attribute] === false ? false : true;
            this[`${attribute}AdminOnly`] = config[`${attribute}AdminOnly`] === 'admin' ? true : false; 
        });
        attributeList = {
            'nameBrightnessLabel': 'Helligkeit', 
            'nameColorTempLabel': 'Farbe-Temperatur', 
            'nameHueLabel': 'Farbton', 
            'nameSaturationLabel': 'Sättigung', 
            'nameRedLabel': 'Rot', 
            'nameGreenLabel': 'Grün', 
            'nameBlueLabel': 'Blau', 
            'nameWhiteLabel': 'Weiß', 
            'nameWarmWhiteLabel': 'Warmweiß', 
            'nameColdWhiteLabel': 'Kaltweiß',
            'nameColorTempTab': 'Farb-Temp',
            'nameColorTempTabTitle': 'Farb-Temperatur',
            'nameHsTab': 'HS-Farbe',
            'nameHsTabTitle': 'Farbton-Sättigung',
            'nameHswTab': 'HSW-Farbe',
            'nameHswTabTitle': 'Farbton-Sättigung-Weiß',
            'nameHswwTab': 'HSWW-Farbe',
            'nameHswwTabTitle': 'Farbton-Sättigung-Weiß-Weiß',
            'nameRgbTab': 'RGB-Farbe',
            'nameRgbTabTitle': 'Rot-Grün-Blau',
            'nameRgbwTab': 'RGBW-Farbe',
            'nameRgbwTabTitle': 'Rot-Grün-Blau-Weiß',
            'nameRgbwwTab': 'RGBWW-Farbe',
            'nameRgbwwTabTitle': 'Rot-Grün-Blau-Weiß-Weiß',
            'nameAutoButtonTitle': 'Automatisch',
            'nameOnButtonTitle': 'An',
            'nameOffButtonTitle': 'Aus',
            'nameMenuButtonTitle': 'Menu',
            'nameLessButtonTitle': 'Verringern',
            'nameMoreButtonTitle': 'Erhöhen'
        };
        Object.entries(attributeList).forEach(([key, value]) => {
            this[key] = config[`re${key}`] && typeof config[`re${key}`] === 'string' && config[`re${key}`].trim() !== '' ? config[`re${key}`] : value;
        });
        if (config.menuLinks && Array.isArray(config.menuLinks)) {
            this.menuLinks = config.menuLinks.map(link => {
                if (!link.url || typeof link.url !== 'string' || link.url.trim() === '') {
                    throw new Error("Jeder Menülink muss eine gültige 'url'-Eigenschaft haben.");
                }
                return {
                    name: link.name && typeof link.name === 'string' && link.name.trim() !== '' ? link.name : link.url,
                    url: link.url,
                    adminOnly: link.adminOnly === true ? true : false
                };
            });
        } else {
            this.menuLinks = [];
        }

        processStyles(config, this.style);
    }
      
    getCardSize() {
        return 1;
    }
} 

function showMoreInfo(entityId, element) {
    const event = new Event('hass-more-info', { bubbles: true, composed: true });
    event.detail = { entityId };
    element.dispatchEvent(event);
}

function callService(hass, domain, service, data) {
    hass.callService(domain, service, data)
        .catch(err => console.error(`Fehler beim Aufruf des Dienstes ${domain}.${service}:`, err));
}

function handleControlButtons(mode, config, domain, callService) {
    if (mode === 'auto') {
        if (config.autoEntity) {
            callService('automation', 'turn_on', { entity_id: config.autoEntity });
        }
    } else if (mode === 'on') {
        if (config.autoEntity) {
            callService('automation', 'turn_off', { entity_id: config.autoEntity });
        }
        callService(domain, 'turn_on', { entity_id: config.entity });
    } else if (mode === 'off') {
        if (config.autoEntity) {
            callService('automation', 'turn_off', { entity_id: config.autoEntity });
        }
        callService(domain, 'turn_off', { entity_id: config.entity });
    }
}

function handleSliederChange(sliderId, value, config, colorValue, hasValue, callService) {
    value = parseFloat(value);
    const hue = parseFloat(colorValue.hue);
    const saturation = parseFloat(colorValue.saturation);
    const red = sliderId === 'red' ? value : parseFloat(colorValue.red);
    const green = sliderId === 'green' ? value : parseFloat(colorValue.green);
    const blue = sliderId === 'blue' ? value : parseFloat(colorValue.blue);
    const warm = sliderId === 'white' || sliderId === 'warm-white' ? value : parseFloat(colorValue.warm);
    const cold = sliderId === 'cold-white' ? value : parseFloat(colorValue.cold);
    if (sliderId === 'brightness' && hasValue.brightness) {
        callService('light', 'turn_on', {entity_id: config.entity, brightness: value});
    } else if (sliderId === 'color-temp' && hasValue.colorTemp) {
        callService('light', 'turn_on', {entity_id: config.entity, color_temp: value});
    } else if (sliderId === 'color-temp-kelvin' && hasValue.colorTemp) {
        callService('light', 'turn_on', {entity_id: config.entity, color_temp_kelvin: value});
    } else if (sliderId === 'hue' && (hasValue.rgbColor || hasValue.rgbwColor || hasValue.rgbwwColor)) {
        callService('light', 'turn_on', {entity_id: config.entity, hs_color: [value, saturation]});
    } else if (sliderId === 'saturation' && (hasValue.rgbColor || hasValue.rgbwColor || hasValue.rgbwwColor)) {
        callService('light', 'turn_on', {entity_id: config.entity, hs_color: [hue, value]});
    } else if (hasValue.rgbwwColor) {
        callService('light', 'turn_on', {entity_id: config.entity, rgbww_color: [red, green, blue, warm, cold]});
    } else if (hasValue.rgbwColor) {
        callService('light', 'turn_on', {entity_id: config.entity, rgbw_color: [red, green, blue, warm]});
    } else if (hasValue.rgbColor) {
        callService('light', 'turn_on', {entity_id: config.entity, rgbw_color: [red, green, blue]});
    }
}

function updateValueCirclePosition(slider, valueCircle) {
    valueCircle.textContent = slider.value;
    const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    const newPosition = Math.round(slider.offsetWidth - 20) / 100 * percent - (valueCircle.offsetWidth / 4);
    valueCircle.style.left = `${newPosition}px`;
}

function controlButtonHtml(id, title, icon, active) {
    return `
        <button class="control-button ${active ? 'active' : ''}" id="control-${id}" data-mode="${id}" title="${title}">
            <ha-icon icon="${icon}"></ha-icon>
        </button>
    `;
}

function tabButtonHtml(mode, title, name, active = false) {
    return `
        <button class="tab-button ${active ? 'active' : ''}" id="tab-${mode}" data-mode="${mode}" title="${title}">${name}</button>
    `;    
}

function sliderHtml(id, title, label, labelValue, labelValue2, value, min, max, step, buttonSteps, lessIcon, moreIcon, config, enabled = false) {
    const lessValue = Math.max(min, Math.ceil(parseFloat(value) - parseFloat(buttonSteps)));
    const moreValue = Math.min(max, Math.ceil(parseFloat(value) + parseFloat(buttonSteps)));
    return `
        <div id="${id}" class="slider-field ${enabled ? 'enabled' : ''}" title="${title}">
            ${config.showLabels && (config.showLabelsAdminOnly ? config.isAdmin : true) ? ` 
                <label>${label}: 
                    ${config.showLabelValues && (config.showLabelValuesAdminOnly ? config.isAdmin : true) ? `
                        <span id="${id}-value">
                            <div>${labelValue2}</div>
                            <div>${labelValue}</div>
                        </span>
                    ` : ''}
                </label>
            ` : ''}
            <div>
                ${config.showMoreAndLessButtons ? sliderButtonHtml(`${id}-less-button`, config.nameLessButtonTitle, lessIcon, lessValue) : ''}
                <div class="slider-container">
                    <div id="${id}-value-circle" class="slider-value-circle">${value}</div>
                    <input type="range" id="${id}-slider" class="slider" min="${min}" max="${max}" value="${value}" step="${step}" title="${title}">
                </div>
                ${config.showMoreAndLessButtons ? sliderButtonHtml(`${id}-more-button`, config.nameMoreButtonTitle, moreIcon, moreValue) : ''}
            </div>
        </div>
    `;
}

function sliderButtonHtml(id, title, icon, value) {
    return `
        <button class="slider-button" id="${id}" data-mode="${value}" title="${title}">
            <ha-icon icon="${icon}"></ha-icon>
        </button>
    `;
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
    return [Math.min(255, Math.max(0, red)), Math.min(255, Math.max(0, green)), Math.min(255, Math.max(0, blue))].join(', ');
}

function miredToRgb(mired) {
    return kelvinToRgb(1000000 / mired)
}

function isValidIcon(icon) {
    if (!icon.startsWith('mdi:')) {
        console.error(`Ungültiges Icon: ${icon}. Icons müssen mit 'mdi:' beginnen.`);
        return false;
    } else if (!icon) {
        return false;
    } else {
        return true;
    }
}

function isValidCssProperty(property, value) {
    const element = document.createElement('div');
    let isValid = false;
    if (property === 'icon-size') {
        element.style.width = value;
        isValid = element.style.width === value;
    } else { 
        element.style.setProperty(property, value);
        isValid = element.style.getPropertyValue(property) === value;
    }
    if (!isValid) {
        console.error(`Ungültige CSS-Eigenschaft: ${property}: ${value}`);
    }
    return isValid;
}

function applyCardStyles(styles, allowedProperties, deleteProperties, targetStyle, prefix) {
    const filteredStyles = {...styles};
    if (deleteProperties) {
        for (const property of deleteProperties) {
            if (property in filteredStyles) {
                delete filteredStyles[property];
            }
        }
    }
    for (const [property, value] of Object.entries(filteredStyles)) {
        if (allowedProperties.includes(property) && isValidCssProperty(property, value)) {
            targetStyle.setProperty(`${prefix}${property}`, value);
        } else {
            console.error(`Ungültige oder nicht unterstützte CSS-Eigenschaft: ${property}: ${value}`);
        }
    }
}

function processStyles(config, targetStyle){
    if (config.styles) {
        if (config.styles.card){
            const stylesList = ['background', 'border', 'border-radius', 'margin', 'outline', 'padding'];
            applyCardStyles(config.styles.card, stylesList, null, targetStyle, '--card-');
        }
        if (config.styles.icon) {
            const stylesList = ['background', 'border', 'border-radius', 'color', 'margin', 'outline', 'padding', 'icon-size'];
            applyCardStyles(config.styles.icon, stylesList, ['active'], targetStyle, '--icon-');
            if (config.styles.icon.active) {
                applyCardStyles(config.styles.icon.active, ['background', 'color'], null, targetStyle, '--icon-active-');
            }
        }
        if (config.styles.name) {
            const stylesList = ['background', 'border', 'border-radius', 'color', 'font-size', 'font-style', 'font-weight', 'margin', 'outline', 'padding', 'text-align', 'text-decoration'];
            applyCardStyles(config.styles.name, stylesList, null, targetStyle, '--name-');
        }
        if (config.styles['menu-button']) {
            const stylesList = ['background', 'border', 'border-radius', 'color', 'margin', 'outline', 'padding', 'icon-size'];
            applyCardStyles(config.styles['menu-button'], stylesList, null, targetStyle, '--menu-button-');
        }
        if (config.styles['menu-content']) {
            const stylesList = ['background', 'border', 'border-radius', 'color', 'font-size', 'font-style', 'font-weight', 'text-align', 'text-decoration', 'margin', 'padding'];
            applyCardStyles(config.styles['menu-content'], stylesList, null, targetStyle, '--menu-content-');
        }
        if (config.styles.buttons) {
            const stylesList = ['background', 'border', 'border-radius', 'color', 'font-size', 'font-style', 'font-weight', 'text-align', 'text-decoration', 'margin', 'outline', 'padding', 'icon-size'];
            const deleteList = ['active', 'auto', 'on', 'off', 'tab', 'slider'];
            applyCardStyles(config.styles.buttons, stylesList, deleteList, targetStyle, '--button-');
            if (config.styles.buttons.active) {
                applyCardStyles(config.styles.buttons.active, ['background', 'color'], null, targetStyle, '--button-active-');
            }
            forEach(['auto', 'on', 'off', 'tab'], (button) => {
                if (config.styles.buttons[button]) {
                    applyCardStyles(config.styles.buttons[button], ['background', 'color'], ['active'], targetStyle, `--${button}-button-`);
                    if (config.styles.buttons[button].active) {
                        applyCardStyles(config.styles.buttons[button].active, ['background', 'color'], null, targetStyle, `--${button}-button-active-`);
                    }
                }
            });
            if (config.styles.buttons.slider) {
                applyCardStyles(config.styles.buttons.slider, ['background', 'color'], null, targetStyle, '--slider-button-');
            }
        } 
        if (config.styles.sliders) {
            const stylesList = ['border', 'border-radius', 'height', 'margin', 'outline', 'padding', 'width'];
            const deleteList = ['labels', 'values', 'value-circle', 'brightness', 'color-temp', 'color-temp-kelvin', 'hue', 'saturation', 'red', 'green', 'blue', 'white', 'warm-white', 'cold-white', 'thumb'];
            applyCardStyles(config.styles.sliders, stylesList, deleteList, targetStyle, '--slider-');
            if (config.styles.sliders.labels) {
                const stylesList = ['background', 'border', 'border-radius', 'color', 'font-size', 'font-style', 'font-weight', 'margin', 'text-align', 'text-decoration', 'padding'];
                applyCardStyles(config.styles.sliders.labels, stylesList, null, targetStyle, '--slider-label-');
            }
            if (config.styles.sliders.values) {
                const stylesList = ['color', 'font-size', 'font-style', 'font-weight', 'margin', 'min-width', 'text-align', 'text-decoration', 'padding'];
                applyCardStyles(config.styles.sliders.values, stylesList, null, targetStyle, '--slider-value-');
            }
            if (config.styles.sliders['value-circle']) {
                const stylesList = ['background', 'border', 'border-radius', 'color', 'font-size', 'font-style', 'font-weight', 'text-decoration', 'top', 'width'];
                applyCardStyles(config.styles.sliders['value-circle'], stylesList, null, targetStyle, '--slider-value-circle-');
            }
            const sliderList = ['brightness', 'color-temp', 'color-temp-kelvin', 'hue', 'saturation', 'red', 'green', 'blue', 'white', 'warm-white', 'cold-white'];
            sliderList.forEach((slider) => {
                if (config.styles.sliders[slider]) {
                    applyCardStyles(config.styles.sliders[slider], ['background'], null, targetStyle, `--slider-${slider}-`);
                }
            });
            if (config.styles.sliders.thumb) {
                const stylesList = ['background', 'border', 'border-radius', 'height', 'width', 'outline'];
                applyCardStyles(config.styles.sliders.thumb, stylesList, null, targetStyle, '--slider-thumb-');
            }
        }
    }
}

customElements.define('light-card-2025', LightCard2025);