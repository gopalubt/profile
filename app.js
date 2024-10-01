const myApp = new GpApp("app", {}, {
    toggleDarkMode(){
        this.darkMode = !this.darkMode;
        this.appElement.classList.toggle("darkMode", this.darkMode);
        const togglerElements = this.appElement.querySelectorAll(".theme-toggler") 
        togglerElements.forEach(ele => {
            ele.innerHTML = this.darkMode 
                ? `<i class="bi bi-brightness-high"></i>` 
                : `<i class="bi bi-moon"></i>`;
        });
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    myApp.components = {
        "footer": { path: "/components/footer.html" },
        "main": { path: "/components/main.html" },
        "header": { path: "/components/header.html" }
    };
    myApp.created = async function() {
        try {
            this.resume = await this.fetchData('https://gopalubt.github.io/profile/assets/data/resume.json');
        } catch (err) {
            console.log('Error fetching resume:', err);
        }
    };
    await myApp.loadApp();
});
