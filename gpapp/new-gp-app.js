class GpApp {
    constructor(appElementId) {
        this.appElement = document.getElementById(appElementId);
        this.components = {};
        this.data = {};
        this.currentView = null;
    }

    registerComponent(name, component) {
        this.components[name] = component;
    }

    async renderComponent(name, props) {
        if (this.components[name]) {
            const componentHtml = await this.components[name](props);
            this.appElement.innerHTML = componentHtml;
        } else {
            console.error(`Component ${name} not registered`);
        }
    }

    async loadView(viewName) {
        const view = this.components[viewName];
        if (view) {
            this.currentView = view;
            await this.renderComponent(viewName);
        }
    }

    async fetchData(url, options={}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error("Error fetching data");
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    toggleDarkMode() {
        this.appElement.classList.toggle("dark-mode");
    }
}



