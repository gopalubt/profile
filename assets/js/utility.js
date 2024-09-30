// utility.js
// Fetch HTML from a given URL
export const loadHTML = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Error fetching HTML:', error);
        return '';
    }
};

// Load a specific component into the DOM
export const loadComponent = async (component) => {
    const elements = document.querySelectorAll(`[data-gp-component="${component.name}"]`);
    const componentHtml = await loadHTML(component.path);

    if (componentHtml) {
        const template = document.createElement('template');
        template.innerHTML = componentHtml.trim();

        elements.forEach(el => {
            const fragment = template.content.cloneNode(true);
            el.parentElement.replaceChild(fragment, el);
        });
    }
};

// Load all components in sequence
export const loadComponents = async (components) => {
    for (const component of components) {
        await loadComponent(component);
    }
};
