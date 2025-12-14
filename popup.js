document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('petListContainer');

    // Generate UI from Metadata
    PET_METADATA.forEach(pet => {
        const item = document.createElement('div');
        item.className = 'pet-item';
        item.innerHTML = `
            <img src="${pet.thumb}" class="pet-thumb" alt="${pet.name}">
            <div class="pet-info">
                <div class="pet-name">${pet.name}</div>
                <div class="pet-desc">${pet.description}</div>
            </div>
            <input type="number" id="${pet.storageKey}" min="0" max="10" value="0">
        `;
        listContainer.appendChild(item);
    });

    // Load Saved Settings
    const keys = PET_METADATA.map(p => p.storageKey).concat(['petScale', 'soundEnabled']);
    chrome.storage.local.get(keys, (result) => {
        PET_METADATA.forEach(pet => {
            const val = result[pet.storageKey];
            document.getElementById(pet.storageKey).value = val !== undefined ? val : 0; // Default 0 for new pets, maybe 1 for core?
        });

        // Current core defaults if undefined (first run legacy support)
        if (result.speakiCount === undefined) document.getElementById('speakiCount').value = 1;
        if (result.erpinCount === undefined) document.getElementById('erpinCount').value = 1;

        document.getElementById('petScale').value = result.petScale !== undefined ? result.petScale : 0.5;
        document.getElementById('soundEnabled').checked = result.soundEnabled !== undefined ? result.soundEnabled : true;
    });
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const settings = {};

    // Dynamic Pet Counts
    PET_METADATA.forEach(pet => {
        const el = document.getElementById(pet.storageKey);
        if (el) {
            settings[pet.storageKey] = parseInt(el.value) || 0;
        }
    });

    // Global Settings
    settings.petScale = parseFloat(document.getElementById('petScale').value);
    settings.soundEnabled = document.getElementById('soundEnabled').checked;

    chrome.storage.local.set(settings, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        setTimeout(() => {
            status.textContent = '';
        }, 1500);
    });
});

