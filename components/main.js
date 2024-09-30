const appElement = document.getElementById("app");
const app = {
    htmlText: null,
    virtualDOM: null,
    resume: null,
    darkMode: false,
    directives: ['data-gp-html', 'data-gp-for', 'data-gp-src', 'data-gp-link', 'data-gp-alt'],
    templates: { html: [],for: [], src: [], link: [],alt: [] },
    async loadApp() {
        try {
            await this.loadHTML('./component/home.html'); 
            this.resume = await this.fetchResume(); 
            console.log(this.resume);
            
            this.setDocumentInnerHTML(this.virtualDOM, null);
            this.setDocumentLoops();
            this.updateDOM();  
            
        } catch (error) {
            console.error("Error:", error.message);
        }
    },
    
    async loadHTML(url) {
        try {
            const response = await fetch(url);
            // if (!response.ok) throw new Error('Network response was not ok');

            this.htmlText = await response.text();
            this.virtualDOM = document.createElement('div');
            this.virtualDOM.innerHTML = this.htmlText;
            this.updateTemplates();
        } catch (error) {
            console.error('Error fetching HTML:', error);
        }
    },
    
    updateTemplates() {
        this.templates.html = this.virtualDOM.querySelectorAll("[data-gp-html]");
        this.templates.for = this.virtualDOM.querySelectorAll("[data-gp-for]");
        this.templates.src = this.virtualDOM.querySelectorAll("[data-gp-src]");
        this.templates.link = this.virtualDOM.querySelectorAll("[data-gp-link]");
        this.templates.alt = this.virtualDOM.querySelectorAll("[data-gp-alt]");
    },

    async fetchResume() {
        try {
            const res = await fetch('../assets/data/resume.json');
            if (!res.ok) throw new Error("An error occurred while fetching the resume.");
            return res.json();
        } catch (error) {
            console.log(error)
            return null
        }
    },

    setDocumentLoops() {
        const loops = this.templates.for;
        loops.forEach(ele => {
            const dataKey = ele.dataset.gpFor;
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
            this.setDOMImgScr(clonedTemplate, { [item]: dataItem })
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
        // this.removeDataAttribute(attribute, element);
        element[attribute] = data !== null && data !== undefined ? data : '';
    },

    // removeDataAttribute(attribute, element){
    //     let attrMap= {
    //         'src':"[data-gp-src]",
    //         'alt':"[data-gp-alt]",
    //         'link':"[data-gp-link]",
    //         'innerHTML':"[data-gp-html]",
    //     }
    //     element.removeAttribute(attrMap[attribute]);
    // },
    toggleDarkMode(){
        const togglerEl = document.querySelectorAll(".theme-toggler") 
        this.darkMode = !this.darkMode;
        if(this.darkMode){
            appElement.classList.add("darkMode");
            togglerEl.forEach(ele=>ele.innerHTML = `<i class="bi bi-brightness-high"></i>` )
        }else{
            appElement.classList.remove("darkMode");
            togglerEl.forEach(ele=> ele.innerHTML = `<i class="bi bi-moon"></i>`)
        }
    },

    updateDOM() {
        // const appElement = document.getElementById('app');
        appElement.innerHTML = this.virtualDOM.innerHTML; 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.loadApp();
});


const toggleDarkMode = ()=>app.toggleDarkMode()