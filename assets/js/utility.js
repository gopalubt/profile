
const app = {
    htmlText:null,
    virtualDOM : null,
    resume: null,
    skill:[],
    directives: [
        'data-gp-html',
        'data-gp-for',
        'data-gp-scr',
        'data-gp-link',
        "data-gp-alt"
    ],
    templates: {
        html: document.querySelectorAll("[data-gp-html]"),
        for: document.querySelectorAll("[data-gp-for]"),
        src: document.querySelectorAll("[data-gp-src]"),
        link: document.querySelectorAll("[data-gp-link]"),
        alt: document.querySelectorAll("[data-gp-alt]"),
    },
    
    // Load the content.html file
    async loadApp() {
        try {
            this.loadHTML('./public/home.html');
            const res = await this.fetchResume();
            this.resume = res;
            this.skills = this.resume.skills;
            console.log(this.resume);
            
            this.setDocumentLoops();
            const pureHTML = document.querySelectorAll("[data-gp-html]");
            this.setDocumentInnerHTML(pureHTML, this.resume);
            // finally update dom 
            document.getElementById('app').innerHTML = this.htmlText; 
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
            this.virtualDOM.innerHTML = this.htmlText
           // Insert HTML into the DOM
        } catch (error) {
            console.error('Error fetching HTML:', error);
        }
    },
    async fetchResume() {
        const res = await fetch('/assets/data/resume.json');
        if (!res.ok) throw new Error("An error occurred while fetching the resume.");
        return res.json();
    },

    setDocumentLoops() {
        let loops = this.virtualDOM.querySelectorAll("[data-gp-for]");
        console.log({loops})
        loops.forEach(ele => {
            const dataKey = ele.dataset.gpFor;
            this.setTemplateLoopData(ele, dataKey);
        });
    },
    
    setTemplateLoopData(ele, dataKey) {
        
        try {
            const template = ele;
            const parentEl = ele.parentElement;
            const [item, collectionPath] = dataKey.split(' of ');
            const collection = collectionPath.split('.').reduce((acc, curr) => acc && acc[curr], this);
            
            if (!Array.isArray(collection)) return;  // Ensure collection is an array
    
            template.removeAttribute("data-gp-for");
            const imgTemplates = template.querySelectorAll('[data-gp-src]');
            const htmlTemplates = template.querySelectorAll('[data-gp-html]');
    
            // Create a document fragment to optimize DOM updates
            const fragment = document.createDocumentFragment();
    
            // Use a loop to build the elements to be appended
            for (let i = 0; i < collection.length; i++) {
                const processedTemplate = template.cloneNode(true);
                const loopingData = { [item]: collection[i] };
    
                this.setDocumentInnerHTML(htmlTemplates, loopingData);
                this.setImgSrc(imgTemplates, loopingData);
                fragment.appendChild(processedTemplate);
            }
    
            // Append all at once
            parentEl.innerHTML = ''; // Clear parent
            parentEl.appendChild(fragment);
        } catch (error) {
            console.error("Error in setTemplateLoopData:", error);
        }
    },
    
    // html 
    setDocumentInnerHTML(template, data) {
        template.forEach(ele => {
            const dataKey = ele.dataset.gpHtml;
            this.setDOMElement('innerHTML', ele, dataKey, data);
            // this.setElementInnerHTML(ele, dataKey, data);
        });
    },

    // img src
    setImgSrc(template, data) {
        template.forEach(ele => {
            const dataKey = ele.dataset.gpSrc;
            const datakeyAlt = ele.dataset.gpAlt;
            this.setDOMElement('src', ele, dataKey, data);
            this.setDOMElement('alt', ele, datakeyAlt, data);
        });

    },
    
    setDOMElement(attribute, element, dataKey, data) {
        if (!element || !dataKey) return;
        const keys = dataKey.split('.');
        for (const key of keys) {
            if (data && key in data) {
                data = data[key];
            } else {
                data = null; 
                break;
            }
            
        }
        element[attribute] = data !== null && data !== undefined ? data : '';
        this.removeDataAttribute(attribute, element)
    },
    removeDataAttribute(attribute, element){
        let attrMap ={
            'src':"[data-gp-src]",
            'alt':"[data-gp-alt]",
            'link':"[data-gp-link]",
            'innerHTML':"[data-gp-html]",
        }
        element.removeAttribute(attrMap[attribute]);
    },
    returnValue:(dataKeys)=>{
        const keys = dataKeys.split('.');
        let data = null
        for (const key of keys) {
            if (data && key in this[data]) {
                data = data[key];
            } else {
                data = null; 
                break;
            }
        }
        return data
    }
    
};

app.loadApp();



