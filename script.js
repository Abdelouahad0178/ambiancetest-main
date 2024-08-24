// Variables globales
let scene, camera, renderer;
let floor, walls = [];
let draggableObjects = [];
let selectedObject = null;
let raycaster, mouse;
let isDragging = false;
let initialMousePosition = new THREE.Vector3();
let initialObjectPosition = new THREE.Vector3();
let currentAction = null; // 'move', 'resize', ou null

const defaultTextures = {
    floor: 'images/CORE_DECOR_COLD_60X60.jpg',
    wall1: 'images/ANIKSA_PULIDO_120x120.jpg',
    wall2: 'images/DUC_BLANC_BURGUINI_S.T_89.8x269.8.jpg'
};

const defaultTexture = 'images/IMG-20240212-WA0041.jpg';

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 7);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    loadTexture(defaultTextures.floor, createFloor);
    loadTexture(defaultTextures.wall1, createFrontWall);
    loadTexture(defaultTextures.wall2, createLeftWall);

    window.addEventListener('resize', onWindowResize, false);

    document.getElementById('floorTexture1').addEventListener('click', () => importTexture('floor'));
    document.getElementById('wallTexture1').addEventListener('click', () => importTexture('wall1'));
    document.getElementById('wallTexture2').addEventListener('click', () => importTexture('wall2'));

    initDragAndDrop();

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    document.addEventListener('keydown', onKeyDown);
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
}

function createMaterial(texture) {
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0.1,
        emissive: new THREE.Color(0x202020),
        emissiveIntensity: 0.3
    });
}

function createFloor(texture) {
    const floorGeometry = new THREE.PlaneGeometry(5, 5);
    const floorMaterial = createMaterial(texture);
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    renderer.render(scene, camera);
}

function createFrontWall(texture) {
    const wallGeometry = new THREE.PlaneGeometry(5, 5);
    const wallMaterial = createMaterial(texture);
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = 2.5;
    wall.position.z = -2.5;
    adjustUVs(wall.geometry.attributes.uv.array, 0.35);
    scene.add(wall);
    walls[0] = wall;
    renderer.render(scene, camera);
}

function createLeftWall(texture) {
    const wallGeometry = new THREE.PlaneGeometry(2.5, 5);
    const wallMaterial = createMaterial(texture);
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = 2.5;
    wall.position.x = -2.2;
    wall.position.z = -0.01;
    wall.rotation.y = Math.PI / 2.1;
    adjustUVs(wall.geometry.attributes.uv.array, 0.35);
    scene.add(wall);
    walls[1] = wall;
    renderer.render(scene, camera);
}

function adjustUVs(uvs, scaleFactor) {
    for (let i = 0; i < uvs.length; i += 2) {
        uvs[i + 1] = (1 - uvs[i + 1]) * scaleFactor + (1 - scaleFactor);
    }
    return uvs;
}

function loadTexture(url, onLoad) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        url,
        function(texture) {
            texture.encoding = THREE.sRGBEncoding;
            onLoad(texture);
        },
        undefined,
        function(error) {
            console.error(`Erreur lors du chargement de la texture : ${url}`, error);
            loadDefaultTexture(onLoad);
        }
    );
}

function loadDefaultTexture(onLoad) {
    loadTexture(defaultTexture, onLoad);
}

function importTexture(target) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const textureURL = e.target.result;
                changeTexture(target, textureURL);
            };
            reader.readAsDataURL(file);
        }
    });

    input.click();
}

function changeTexture(target, textureURL) {
    loadTexture(textureURL, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        let objectToChange;
        switch (target) {
            case 'floor':
                objectToChange = floor;
                break;
            case 'wall1':
                objectToChange = walls[0];
                break;
            case 'wall2':
                objectToChange = walls[1];
                break;
        }

        if (objectToChange) {
            objectToChange.material.map = texture;
            objectToChange.material.needsUpdate = true;
        }

        renderer.render(scene, camera);
    });
}

function initDragAndDrop() {
    const items = document.querySelectorAll('.draggable-item');
    items.forEach(item => {
        item.addEventListener('dragstart', onDragStart);
    });

    document.getElementById('scene-container').addEventListener('dragover', onDragOver);
    document.getElementById('scene-container').addEventListener('drop', onDrop);
}

function onDragStart(event) {
    event.dataTransfer.setData('id', event.target.id);
}

function onDragOver(event) {
    event.preventDefault();
}

function onDrop(event) {
    event.preventDefault();
    const id = event.dataTransfer.getData('id');

    const rect = renderer.domElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const x = (mouseX / rect.width) * 2 - 1;
    const y = -(mouseY / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(floorPlane, intersection);

    const draggedElement = document.getElementById(id);
    const objectUrl = draggedElement ? draggedElement.src : `images/${id}.png`;

    loadTexture(objectUrl, texture => {
        addItemToScene(texture, id, intersection);
    });
}

function addItemToScene(texture, id, position) {
    const aspectRatio = texture.image.width / texture.image.height;
    const itemWidth = 1;
    const itemHeight = itemWidth / aspectRatio;

    const itemGeometry = new THREE.PlaneGeometry(itemWidth, itemHeight);
    const itemMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const item = new THREE.Mesh(itemGeometry, itemMaterial);

    item.position.copy(position);
    item.position.y += itemHeight / 2;

    item.scale.set(1, 1, 1);

    scene.add(item);

    item.userData = { id: id, draggable: true };
    draggableObjects.push(item);

    item.lookAt(camera.position);

    renderer.render(scene, camera);
}

function onMouseDown(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(draggableObjects);
    if (intersects.length > 0) {
        selectedObject = intersects[0].object;
        initialMousePosition.copy(intersects[0].point);
        initialObjectPosition.copy(selectedObject.position);
        if (event.button === 2) { // Clic droit
            showContextMenu(event, selectedObject);
        } else {
            isDragging = true;
            currentAction = 'move';
        }
    } else {
        selectedObject = null;
        currentAction = null;
        hideContextMenu();
    }
}

function onMouseMove(event) {
    if (!selectedObject) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (isDragging && currentAction === 'move') {
        const intersects = raycaster.intersectObject(floor);
        if (intersects.length > 0) {
            const delta = intersects[0].point.clone().sub(initialMousePosition);
            selectedObject.position.copy(initialObjectPosition.clone().add(delta));
        }
    } else if (currentAction === 'resize') {
        const scale = (event.clientY - initialMousePosition.y) * 0.01 + selectedObject.scale.x;
        selectedObject.scale.set(scale, scale, scale);
    }

    renderer.render(scene, camera);
}

function onMouseUp() {
    isDragging = false;
    currentAction = null;
}

function onWheel(event) {
    if (selectedObject) {
        event.preventDefault();
        const scale = selectedObject.scale.x + event.deltaY * -0.001;
        selectedObject.scale.set(scale, scale, scale);
        selectedObject.position.y = selectedObject.geometry.parameters.height * scale / 2;
        renderer.render(scene, camera);
    }
}

function onKeyDown(event) {
    if (event.key === 'Delete' && selectedObject) {
        deleteObject(selectedObject);
        selectedObject = null;
    }
}

function deleteObject(object) {
    scene.remove(object);
    draggableObjects = draggableObjects.filter(obj => obj !== object);
    renderer.render(scene, camera);
}

function showContextMenu(event, object) {
    hideContextMenu(); // Cache le menu précédent s'il existe

    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.style.position = 'absolute';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid black';
    menu.style.padding = '5px';
    menu.style.zIndex = '1000';

    const moveButton = createButton('Déplacer', () => {
        currentAction = 'move';
        hideContextMenu();
    });

    const resizeButton = createButton('Redimensionner', () => {
        currentAction = 'resize';
        hideContextMenu();
    });

    const deleteButton = createButton('Supprimer', () => {
        deleteObject(object);
        hideContextMenu();
    });

    menu.appendChild(moveButton);
    menu.appendChild(resizeButton);
    menu.appendChild(deleteButton);

    document.body.appendChild(menu);

    // Ferme le menu si on clique en dehors
    document.addEventListener('click', hideContextMenu);
}

function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;
    button.style.display = 'block';
    button.style.width = '100%';
    button.style.marginBottom = '5px';
    return button;
}

function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) {
        document.body.removeChild(menu);
    }
    document.removeEventListener('click', hideContextMenu);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Initialisation et démarrage
document.addEventListener('DOMContentLoaded', (event) => {
    init();
    animate();
});
