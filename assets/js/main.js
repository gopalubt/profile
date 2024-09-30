const appElement = document.getElementById("app");
const app = {
    htmlText: null,
    virtualDOM: null,
    resume: null,
    darkMode: false,
    directives: ['data-gp-html', 'data-gp-for', 'data-gp-src', 'data-gp-href', 'data-gp-alt'],
    templates: { html: [], for: [], src: [], href: [], alt: [] },
    async loadApp() {
        try {
            await this.loadHTML('./public/home.html'); 
            this.resume = await this.fetchResume(); 
            console.log(this.resume);
            
            this.setDocumentLoops();
            this.setDocumentInnerHTML(this.virtualDOM, null);
            this.setDOMImgScr(this.virtualDOM, null);
            this.setAnchorHref(this.virtualDOM, null);
            this.updateDOM();  
            
        } catch (error) {
            console.error("Error:", error.message);
        }
    },
    
    async loadHTML(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');

            this.htmlText = await response.text();
            this.virtualDOM = document.createElement('div');
            this.virtualDOM.innerHTML = this.htmlText;
            // this.updateTemplates();
        } catch (error) {
            console.error('Error fetching HTML:', error);
        }
    },

    async fetchResume() {
        try {
            const res = await fetch('./assets/data/resume.json');
            if (!res.ok) throw new Error("An error occurred while fetching the resume.");
            return res.json();
        } catch (error) {
            console.log(error)
            return null
        }
    },
     setDOMElement(attribute, element, dataKey, data=null) {
        if (!element || !dataKey) return;
        const keys = dataKey.split('.');
        if(!data){
            data = {[keys[0]] : this[keys[0]]};
        }
        for (const key of keys) {
            if (data && key in data) {       
                data = data[key];
            } else { 
                data = null; 
                break;
            } 
        }
        element[attribute] = data !== null && data !== undefined ? data : '';
    },

    setDocumentLoops() {
        const loops = this.virtualDOM.querySelectorAll("[data-gp-for]");
        loops.forEach(ele => {
            const dataKey = ele.dataset.gpFor;
            ele.removeAttribute("data-gp-for");
            this.setTemplateLoopData(ele, dataKey);
        });
    },

    setTemplateLoopData(ele, dataKey) {
        const [item, collectionPath] = dataKey.split(' of ');
        const collection = collectionPath.split('.').reduce((acc, curr) => acc && acc[curr], this);
        
        if (!Array.isArray(collection)) return; 

        const parentEl = ele.parentElement;
        const fragment = document.createDocumentFragment(); 

        collection.forEach((dataItem) => {
            const clonedTemplate = ele.cloneNode(true);
            this.setDocumentInnerHTML(clonedTemplate, { [item]: dataItem });
            this.setDOMImgScr(clonedTemplate, { [item]: dataItem });
            this.setAnchorHref(clonedTemplate, { [item]: dataItem });
            this.removeDataAttributes(clonedTemplate);
            fragment.appendChild(clonedTemplate);
        });
        parentEl.replaceChild(fragment, ele); 
    },

    setDocumentInnerHTML(template, data) {
        const htmlElements = template.querySelectorAll("[data-gp-html]");
        htmlElements.forEach(ele => {
            const dataKey = ele.dataset.gpHtml;
            this.setDOMElement('innerHTML', ele, dataKey, data);
        });
    },
    setAnchorHref(template, data) {
        const htmlElements = template.querySelectorAll("[data-gp-href]");
        htmlElements.forEach(ele => {
            const dataKey = ele.dataset.gpHref;
            this.setDOMElement('href', ele, dataKey, data);
        });
    },
    setDOMImgScr(template, data) {
        const htmlElements = template.querySelectorAll("[data-gp-src]");
        htmlElements.forEach(ele => {
            const dataKey = ele.dataset.gpSrc;
            const datakeyAlt = ele.dataset.gpAlt;
            this.setDOMElement('src', ele, dataKey, data);
            if(datakeyAlt){
                this.setDOMElement('alt', ele, datakeyAlt, data);
            }          
        });
    },
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
    },     
    toggleDarkMode(){
        const togglerElements = document.querySelectorAll(".theme-toggler") 
        this.darkMode = !this.darkMode;
        appElement.classList.toggle("darkMode", this.darkMode);
        togglerElements.forEach(ele => {
            ele.innerHTML = this.darkMode 
                ? `<i class="bi bi-brightness-high"></i>` 
                : `<i class="bi bi-moon"></i>`;
        });
    },
    updateDOM() {
        appElement.innerHTML = this.virtualDOM.innerHTML; 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.loadApp();
});

const toggleDarkMode = ()=>app.toggleDarkMode()