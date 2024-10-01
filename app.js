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
        "footer": "../components/footer.html",
        "main": "../components/main.html",
        "header": "../components/header.html"
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
