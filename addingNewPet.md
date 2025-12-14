# How to Add a New Pet

Follow this guide to add a new Trickcal character to the extension.

## 1. Prepare Assets
Create a folder for your pet in `extension/characters/` (e.g., `characters/my-pet/`).

You need at least:
*   **Idle/Walk Image**: `MyPet-Idle.png` (or similar)
*   **Thumbnail**: A square or close-up image for the menu.
*   *(Optional)* **Sound Effects**: Place them in a `sound` subfolder.

## 2. Update Configuration
Open `extension/config.js` and add a new entry to the `PET_METADATA` list:

```javascript
{
    id: "mypet",                   // Unique ID (lowercase)
    name: "My Pet",                // Display Name
    description: "The New Guy",    // Short description
    thumb: "characters/my-pet/thumb.png",
    defaultAnimation: "characters/my-pet/MyPet-Idle.png", 
    storageKey: "myPetCount"       // Unique key for saving settings
}
```

## 3. Create Pet Class
Open `extension/content.js` and create a class for your pet that extends `BasePet`. 
You can define custom behaviors here or copy an existing one like `Speaki`.

```javascript
class MyPet extends BasePet {
    constructor(id, scale = 1.0) {
        super(id, "mypet", scale); // "mypet" must match folder name
        this.setAnimation("MyPet-Idle.png");
        this.stateTimer = 100;
    }

    onDragStart() {
        this.setAnimation("MyPet-Panic.png");
        this.playSound("cry.mp3");
    }

    behaviorTick() {
        if (this.isDragging) return;
        // implementation of walking/idle logic...
    }
}
```

## 4. Register the Class
Still in `extension/content.js`, find the `CLASS_MAP` object near the top (or before `syncPets`) and add your new class:

```javascript
const CLASS_MAP = {
    "speaki": Speaki,
    "erpin": Erpin,
    "mypet": MyPet  // <--- Add this line!
};
```

## 5. Reload
1.  Go to `chrome://extensions`
2.  Click **Reload** on the extension.
3.  Your new pet will appear in the popup menu!
