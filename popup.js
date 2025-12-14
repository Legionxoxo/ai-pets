document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['speakiCount', 'erpinCount', 'petScale', 'soundEnabled'], (result) => {
        document.getElementById('speakiCount').value = result.speakiCount !== undefined ? result.speakiCount : 1;
        document.getElementById('erpinCount').value = result.erpinCount !== undefined ? result.erpinCount : 1;
        document.getElementById('petScale').value = result.petScale !== undefined ? result.petScale : 0.5;
        document.getElementById('soundEnabled').checked = result.soundEnabled !== undefined ? result.soundEnabled : true;
    });

});

document.getElementById('saveBtn').addEventListener('click', () => {
    const speakiCount = parseInt(document.getElementById('speakiCount').value);
    const erpinCount = parseInt(document.getElementById('erpinCount').value);
    const petScale = parseFloat(document.getElementById('petScale').value);
    const soundEnabled = document.getElementById('soundEnabled').checked;

    chrome.storage.local.set({
        speakiCount,
        erpinCount,
        petScale,
        soundEnabled
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        setTimeout(() => {
            status.textContent = '';
        }, 1500);
    });
});
