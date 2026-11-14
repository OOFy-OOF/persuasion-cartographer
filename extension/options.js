const form = document.getElementById('settings-form');
const endpointInput = document.getElementById('endpoint');
const status = document.getElementById('status');
const saveButton = form.querySelector('button[type="submit"]');

chrome.storage.local.get('analyzeEndpoint').then(({ analyzeEndpoint }) => {
    if (analyzeEndpoint) endpointInput.value = analyzeEndpoint;
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.classList.remove('error');

    let endpoint;
    try {
        endpoint = new URL(endpointInput.value.trim());
    } catch {
        status.textContent = 'Enter a valid endpoint URL.';
        status.classList.add('error');
        return;
    }

    const isLocalHttp = endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname);
    if ((endpoint.protocol !== 'https:' && !isLocalHttp) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !endpoint.pathname.endsWith('/analyze')) {
        status.textContent = 'Use an HTTPS URL ending in /analyze. HTTP is allowed only for localhost development.';
        status.classList.add('error');
        return;
    }

    const originPattern = `${endpoint.origin}/*`;
    saveButton.disabled = true;
    status.textContent = 'Requesting access to the configured host...';
    try {
        const granted = await chrome.permissions.request({ origins: [originPattern] });
        if (!granted) throw new Error('Host permission was not granted. The endpoint was not saved.');

        const { analyzeEndpoint: previousEndpoint } = await chrome.storage.local.get('analyzeEndpoint');
        await chrome.storage.local.set({ analyzeEndpoint: endpoint.href });
        if (previousEndpoint) {
            const previousOrigin = new URL(previousEndpoint).origin;
            if (previousOrigin !== endpoint.origin) {
                try {
                    await chrome.permissions.remove({ origins: [`${previousOrigin}/*`] });
                } catch (error) {
                    // Keep the working new endpoint if Chrome cannot revoke the old grant.
                }
            }
        }
        status.textContent = 'Endpoint saved. You can now analyse selected text.';
    } catch (error) {
        status.textContent = error.message || 'Could not save the endpoint.';
        status.classList.add('error');
    } finally {
        saveButton.disabled = false;
    }
});
