const textInput = document.getElementById('text-input');
const analyzeButton = document.getElementById('analyze-button');
const status = document.getElementById('status');
const results = document.getElementById('results');

document.getElementById('settings-button').addEventListener('click', () => chrome.runtime.openOptionsPage());

async function loadSelection() {
    try {
        const { pendingSelection } = await chrome.storage.session.get('pendingSelection');
        if (pendingSelection?.trim()) {
            textInput.value = pendingSelection.trim();
            await chrome.storage.session.remove('pendingSelection');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !/^https?:/.test(tab.url || '')) return;
        const [selection] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString() || ''
        });
        if (selection?.result?.trim()) textInput.value = selection.result.trim();
    } catch (error) {
        // Some browser pages do not allow extension scripts; paste remains available.
    }
}

function addText(parent, tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
}

function renderAnalysis(data) {
    results.classList.remove('hidden');
    document.getElementById('confidence').textContent = `Confidence: ${data.confidence}`;

    const abstain = document.getElementById('abstain');
    abstain.replaceChildren();
    const techniqueSpans = Array.isArray(data.technique_spans) ? data.technique_spans : [];
    const abstained = data.abstain || techniqueSpans.length === 0;
    if (abstained) {
        abstain.classList.remove('hidden');
        addText(abstain, 'strong', '', 'The tool abstained.');
        addText(abstain, 'div', '', data.abstain_reason || 'No rhetorical technique could be supported by an exact quote.');
    } else {
        abstain.classList.add('hidden');
    }

    const spans = document.getElementById('spans');
    spans.replaceChildren();
    for (const span of techniqueSpans) {
        const card = addText(spans, 'article', 'technique-card', '');
        const heading = addText(card, 'div', 'technique-heading', '');
        const label = addText(heading, 'span', 'technique-label', span.technique.replace(/_/g, ' '));
        const flagButton = addText(heading, 'button', 'flag-button', 'Flag inaccurate');
        flagButton.type = 'button';
        flagButton.setAttribute('aria-label', `Flag ${label.textContent} as inaccurate`);
        flagButton.addEventListener('click', () => submitTechniqueFlag(span.technique, flagButton));
        addText(card, 'blockquote', '', span.quote);
        addText(card, 'p', 'explanation', span.explanation);
    }

    const framing = document.getElementById('framing');
    framing.replaceChildren();
    for (const note of data.framing_notes || []) {
        const item = document.createElement('li');
        addText(item, 'strong', '', `${note.kind.replace(/_/g, ' ')}: `);
        addText(item, 'span', '', note.note);
        framing.appendChild(item);
    }
    document.getElementById('framing-section').classList.toggle('hidden', framing.children.length === 0);
}

async function submitTechniqueFlag(technique, button) {
    button.disabled = true;
    button.textContent = 'Sending...';
    button.classList.remove('flag-error');
    try {
        const { analyzeEndpoint } = await chrome.storage.local.get('analyzeEndpoint');
        if (!analyzeEndpoint) throw new Error('Configure your API endpoint before sending feedback.');
        const endpoint = new URL(analyzeEndpoint);
        const hasPermission = await chrome.permissions.contains({ origins: [`${endpoint.origin}/*`] });
        if (!hasPermission) throw new Error('The API host permission is missing.');
        endpoint.pathname = endpoint.pathname.replace(/\/analyze$/, '/feedback');

        const response = await fetch(endpoint.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ technique })
        });
        if (!response.ok) throw new Error(`Feedback failed (${response.status}).`);
        button.textContent = 'Flagged ✓';
        button.classList.add('flagged');
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Retry flag';
        button.title = error.message || 'Could not submit feedback. Please try again.';
        button.classList.add('flag-error');
    }
}

analyzeButton.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
        status.textContent = 'Select or paste some text first.';
        status.classList.add('error');
        return;
    }
    if (text.length > 20000) {
        status.textContent = 'Please keep the text under 20,000 characters.';
        status.classList.add('error');
        return;
    }

    analyzeButton.disabled = true;
    analyzeButton.textContent = 'Analysing...';
    status.textContent = '';
    status.classList.remove('error');
    results.classList.add('hidden');
    try {
        const { analyzeEndpoint } = await chrome.storage.local.get('analyzeEndpoint');
        if (!analyzeEndpoint) {
            status.textContent = 'Configure your deployed API endpoint before analysing.';
            status.classList.add('error');
            await chrome.runtime.openOptionsPage();
            return;
        }

        const endpoint = new URL(analyzeEndpoint);
        const hasPermission = await chrome.permissions.contains({ origins: [`${endpoint.origin}/*`] });
        if (!hasPermission) {
            status.textContent = 'The API host permission is missing. Reconfigure the endpoint and grant access.';
            status.classList.add('error');
            await chrome.runtime.openOptionsPage();
            return;
        }

        const response = await fetch(analyzeEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!response.ok) {
            const detail = await response.json().catch(() => ({}));
            throw new Error(detail.detail || `Analysis request failed (${response.status}).`);
        }
        renderAnalysis(await response.json());
    } catch (error) {
        status.textContent = `Could not analyse this text. ${error.message || 'Check your connection and try again.'}`;
        status.classList.add('error');
    } finally {
        analyzeButton.disabled = false;
        analyzeButton.textContent = 'Analyse text';
    }
});

loadSelection();
