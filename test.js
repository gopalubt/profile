const myApp = new GpApp("app");
document.addEventListener('DOMContentLoaded', async () => {
    myApp.components = {
        "footer": "/components/footer.html",
        "main": "/components/main.html",
        "header": "/components/header.html",
    };
    myApp.created = async function() {
        try {
            this.resume = await this.fetchData('/assets/data/resume.json');
        } catch (err) {
            console.log('Error fetching resume:', err);
        }
    };
    await myApp.loadApp();
});

const toggleDarkMode = ()=>myApp.toggleDarkMode()