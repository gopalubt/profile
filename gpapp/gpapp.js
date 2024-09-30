class GpApp {
    constructor(appElementId) {
        this.appElement = document.getElementById(appElementId);
        this.htmlText = null;
        this.virtualDOM = null;
        this.resume = null;
        this.darkMode = false;
        this.directives = ['data-gp-html', 'data-gp-for', 'data-gp-src', 'data-gp-link', 'data-gp-alt'];
        this.templates = { html: [], for: [], src: [], link: [], alt: [] };
    }

    async loadApp() {
        try {
            await this.loadHTML('./public/home.html'); 
            // await this.loadComponents(); 
           await this.created();
            console.log(this.resume);
            
            this.renderDOM();
            this.updateDOM();
        } catch (error) {
            console.error("Error:", error.message);
        }
    }
    async created(){
        // this.resume = await this.fetchResume(); 
    }

    async loadHTML(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');

            this.htmlText = await response.text();
            this.virtualDOM = this.createVirtualDOM(this.htmlText);
            this.updateTemplates();
        } catch (error) {
            console.error('Error fetching HTML:', error);
        }
    }

    createVirtualDOM(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv;
    }

    updateTemplates() {
        this.templates.html = this.virtualDOM.querySelectorAll("[data-gp-html]");
        this.templates.for = this.virtualDOM.querySelectorAll("[data-gp-for]");
        this.templates.src = this.virtualDOM.querySelectorAll("[data-gp-src]");
        this.templates.link = this.virtualDOM.querySelectorAll("[data-gp-link]");
        this.templates.alt = this.virtualDOM.querySelectorAll("[data-gp-alt]");
    }

    // async fetchResume() {
    //     try {
    //         const response = await fetch('./assets/data/resume.json');
    //         if (!response.ok) throw new Error("An error occurred while fetching the resume.");
    //         return await response.json();
    //     } catch (error) {
    //         console.error(error);
    //         return null;
    //     }
    // }
    async fetchData(url, options={}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error("An error occurred while fetching the resume.");
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    renderDOM() {
        this.setDocumentInnerHTML(this.virtualDOM, null);
        this.setDocumentLoops();
    }

    setDocumentLoops() {
        const loops = this.templates.for;
        loops.forEach(element => {
            const dataKey = element.dataset.gpFor;
            this.populateTemplateLoop(element, dataKey);
        });
    }

    populateTemplateLoop(element, dataKey) {
        const [item, collectionPath] = dataKey.split(' of ');
        const collection = this.resolveDataPath(collectionPath);
        
        if (!Array.isArray(collection)) return; 

        const parentEl = element.parentElement;
        const fragment = document.createDocumentFragment(); 

        collection.forEach(dataItem => {
            const clonedTemplate = element.cloneNode(true);
            this.setDocumentInnerHTML(clonedTemplate, { [item]: dataItem });
            this.setImageSrc(clonedTemplate, { [item]: dataItem });
            this.removeDataAttributes(clonedTemplate);
            fragment.appendChild(clonedTemplate);
        });
        
        parentEl.replaceChild(fragment, element); 
    }

    resolveDataPath(path) {
        return path.split('.').reduce((acc, curr) => acc && acc[curr], this);
    }

    setDocumentInnerHTML(template, data) {
        const elements = template.querySelectorAll("[data-gp-html]");
        elements.forEach(ele => {
            const dataKey = ele.dataset.gpHtml;
            this.setDOMAttribute('innerHTML', ele, dataKey, data);
        });
    }

    setImageSrc(template, data) {
        const elements = template.querySelectorAll("[data-gp-src]");
        elements.forEach(ele => {
            const dataKey = ele.dataset.gpSrc;
            const altKey = ele.dataset.gpAlt;
            this.setDOMAttribute('src', ele, dataKey, data);
            if (altKey) {
                this.setDOMAttribute('alt', ele, altKey, data);
            }          
        });
    }

    setDOMAttribute(attribute, element, dataKey, data = null) {
        if (!element || !dataKey) return;
        const keys = dataKey.split('.');
        data = data || { [keys[0]]: this[keys[0]] };

        for (const key of keys) {
            if (data && key in data) {       
                data = data[key];
            } else { 
                data = null; 
                break;
            } 
        }

        element[attribute] = data !== null && data !== undefined ? data : '';
    }

    toggleDarkMode() {
        const togglerElements = document.querySelectorAll(".theme-toggler"); 
        this.darkMode = !this.darkMode;
        
        this.appElement.classList.toggle("darkMode", this.darkMode);
        
        togglerElements.forEach(ele => {
            ele.innerHTML = this.darkMode 
                ? `<i class="bi bi-brightness-high"></i>` 
                : `<i class="bi bi-moon"></i>`;
        });
    }
    removeDataAttributes(element) {
        // Use a loop to gather all elements within the provided element
        const elements = element.querySelectorAll('*'); // Select all descendant elements
    
        // Iterate over each element
        elements.forEach(el => {
            // Collect the attributes to remove
            const attributesToRemove = [];
            for (let attr of el.attributes) {
                if (attr.name.startsWith('data-gp-')) {
                    attributesToRemove.push(attr.name); // Store attribute names for removal
                }
            }
    
            // Remove the gathered attributes
            attributesToRemove.forEach(attrName => {
                el.removeAttribute(attrName);
            });
        });
    }
    
    updateDOM() {
        this.appElement.innerHTML = this.virtualDOM.innerHTML; 
    }

    // async loadHTML (url) {
    //     try {
    //         const response = await fetch(url);
    //         if (!response.ok) {
    //             throw new Error(`Failed to fetch: ${response.statusText}`);
    //         }
    //         return await response.text();
    //     } catch (error) {
    //         console.error('Error fetching HTML:', error);
    //         return '';
    //     }
    // }
    // async loadComponent (component) {
    //     const elements = document.querySelectorAll(`[data-gp-component="${component.name}"]`);
    //     const componentHtml = await loadHTML(component.path);
    
    //     if (componentHtml) {
    //         const template = document.createElement('template');
    //         template.innerHTML = componentHtml.trim();
    
    //         elements.forEach(el => {
    //             const fragment = template.content.cloneNode(true);
    //             el.parentElement.replaceChild(fragment, el);
    //         });
    //     }
    // };
    
    // // Load all components in sequence
    // async loadComponents (components) {
    //     for (const component of components) {
    //         await loadComponent(component);
    //     }
    // };
};

// Load a specific component into the DOM
 
