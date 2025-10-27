function loadHead(pageTitle) {
    document.title = pageTitle + " | School Management";

    const headElements = [
        // Meta tags
        { tag: 'meta', attributes: { charset: 'utf-8' } },
        { tag: 'meta', attributes: { 'http-equiv': 'x-ua-compatible', content: 'ie=edge' } },
        { tag: 'meta', attributes: { name: 'description', content: '' } },
        { tag: 'meta', attributes: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },

        // Favicon
        { tag: 'link', attributes: { rel: 'shortcut icon', type: 'image/x-icon', href: '../assets/img/favicon.png' } },

        // CSS Stylesheets
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/normalize.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/main.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/bootstrap.min.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/all.min.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/fonts/flaticon.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/fullcalendar.min.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/datepicker.min.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/select2.min.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/css/animate.min.css' } },
        { tag: 'link', attributes: { rel: 'stylesheet', href: '../assets/style.css' } },

        // Scripts for the head
        // { tag: 'script', attributes: { src: '../config.js' } },
        { tag: 'script', attributes: { src: '../assets/js/modernizr-3.6.0.min.js' } },
    ];

    headElements.forEach(elem => {
        const newElement = document.createElement(elem.tag);
        for (const attr in elem.attributes) {
            newElement.setAttribute(attr, elem.attributes[attr]);
        }
        document.head.appendChild(newElement);
    });
}

function loadFooterScripts(pageSpecificScripts = []) {
    const commonScriptSources = [
        // Vendor scripts
        '../assets/js/jquery-3.3.1.min.js',
        '../assets/js/plugins.js',
        '../assets/js/popper.min.js',
        '../assets/js/bootstrap.min.js',
        '../assets/js/select2.min.js',
        '../assets/js/datepicker.min.js',
        '../assets/js/jquery.counterup.min.js',
        '../assets/js/moment.min.js',
        '../assets/js/jquery.waypoints.min.js',
        '../assets/js/jquery.scrollUp.min.js',
        '../assets/js/fullcalendar.min.js',
        '../assets/js/Chart.min.js',
        // Custom scripts
        '../assets/js/main.js',
        // 'app.js' is now considered page-specific for the main dashboard layout
    ];

    const allScripts = commonScriptSources.concat(pageSpecificScripts);

    function loadScript(index) {
        if (index >= allScripts.length) {
            return;
        }
        const script = document.createElement('script');
        script.src = allScripts[index];
        script.onload = () => {
            loadScript(index + 1);
        };
        script.onerror = () => {
            console.error(`Failed to load script: ${allScripts[index]}`);
            loadScript(index + 1); // Continue loading other scripts even if one fails
        };
        document.body.appendChild(script);
    }

    loadScript(0);
}
