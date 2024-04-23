import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import * as CANNON from 'cannon-es'


/**
 * Debug
 */
const gui = new GUI()
const debugObject = {}

debugObject.createSphere = () => {
    createSphere(
        Math.random() * 0.5, 
        {
            x: (Math.random() * 0.5) * 3,
            y: 3,
            z: (Math.random() * 0.5) * 3
        }) 
}

debugObject.createBox = () => {
    createBox(
        Math.random(), 
        Math.random(),
        Math.random(),
        {
            x: (Math.random() * 0.5) * 3,
            y: 3,
            z: (Math.random() * 0.5) * 3
        }) 
}
debugObject.reset = () => {
    // console.log('reset')
    for (const object of objectToUpdate) {
        // Remove events
        object.body.removeEventListener('collide', playHitSound)
        world.removeBody(object.body)

        // Remove mesh
        scene.remove(object.mesh)

    }

    objectToUpdate.splice(0, objectToUpdate.length) //empty the array as well

}

gui.add(debugObject, 'createSphere')
gui.add(debugObject, 'createBox')
gui.add(debugObject, 'reset')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * EXTRA: Axes helper
 */

const axesHelper= new THREE.AxesHelper( 5 );
scene.add(axesHelper)

/**
 * INFO: Sounds
 */

const hitSound = new Audio('/sounds/hit.mp3')

const playHitSound = (colission) => {

    // Only play if the impact strength if big enough 
    // console.log(colission.contact.getImpactVelocityAlongNormal())
    const impactStrength = colission.contact.getImpactVelocityAlongNormal()
    // EXTRA: play volume according to strength
    // const minVolume = 0.3
    // const maxVolume = 2

    // const volume = Math.max(minVolume, Math.min(maxVolume, impactStrength / 10))

   

    if(impactStrength > 1) {
        hitSound.volume = Math.random() //add randomness to sound volume - changed when added volume according to strength
        hitSound.currentTime = 0 //reset sound to its start before playing again
        hitSound.play()
    }  
}

// EXTRA: Ball sound

const boingSound = new Audio('/sounds/boing.mp3')
// console.log(boingSound)

const playBoingSound = (colission) => {

    // Only play if the impact strength if big enough 
    // console.log(colission.contact.getImpactVelocityAlongNormal())
    const impactStrength = colission.contact.getImpactVelocityAlongNormal()
    // EXTRA: play volume according to strength
    const minVolume = 0.1
    const maxVolume = 0.1

    const volume = Math.max(minVolume, Math.min(maxVolume, impactStrength / 10))

    boingSound.volume = volume //Math.random() //add randomness to sound volume - changed when added volume according to strength
    boingSound.currentTime = 0 //reset sound to its start before playing again

    if(impactStrength > 2.5) {
        boingSound.play()
    }  
}


/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

/**
 * Physics
 */

const world = new CANNON.World();
// INFO: broadphase = testing body against body colission. Default: naive approach
// Grid broadphase - divides the scene in a grid in every direction. Testing is performed against other objects in the grid and the side/edge of the neighbours, but not the ones further away. Good way of doing things. Issues appear when an object travels very fast and testing doesn't get perfomed.
// Sweep and Prune (SAPBroadphase) - tests bodies on arbitrary axes during multiple steps - recommended to use for better performance

world.broadphase = new CANNON.SAPBroadphase(world) 
world.allowSleep = true //improves performance really well. It tells the computer the objects that have stopped moving are sleeping and won't be testing them while in that state
                        // control how likely it is for the body to fall asleep with sleepSpeedLimit and sleepTimeLimit

world.gravity.set(0, -9.82, 0) //-9.82 - gravity on earth. vec3 - same as vector3 in three.js, but for cannon.js. works almost the same

/**
 * INFO: Materials = reference (unlike in Three.js, in cannon.js it only sets the type of surface the objects falls on/interacts with)
 *  - changes friction and bouncing behavious
 * - we should create one material for each type of material in the scene
  */

// Default material
const defaultMaterial = new CANNON.Material('default')

// // create the reference materials
// const concreteMaterial = new CANNON.Material('concrete'); //name not important
// const plasticMaterial = new CANNON.Material('plastic'); 

// Create the ContactMaterial - where we provide properties of what happens when one type of material meets another
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1, //slipperier with smaller friction value. 
        restitution: 0.7 // how much it boings. 0.3 default value
    }
)

world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial

/**
 * INFO: Body = objects that can fall and collide with other objects
  - like mesh in three.js
  - shapes: box, cylinder, plane, sphere, etc
  */

// // 1. Create shape - sphere

// const sphereShape = new CANNON.Sphere(0.5)

// // 2. Create body using mass and position

// const sphereBody = new CANNON.Body({
//     mass: 1, //highest mass pushes the lighter one - can tweak
//     position: new CANNON.Vec3(0, 3, 0), //a bit higher than the object
//     shape: sphereShape,
//     // material: defaultMaterial
// })
// sphereBody.applyLocalForce(new CANNON.Vec3(150, 0, 0), new CANNON.Vec3(0, 0, 0)) 
// world.addBody(sphereBody) //cannon-es only supports addBody. add would work in this case, but better to use addBody

// 3. Update cannon.js world for each frame - using step(...) inside tick function below

// INFO: Floor - physics floor to stop the sphere from 'falling' through the three.js plane

const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
// floorBody.material = defaultMaterial
floorBody.mass = 0 //tells cannon.js that the object is static, won't move. It can be omitted and we would still get the same result
floorBody.addShape(floorShape) //can add many shapes to a body

// atm, the plane is created facing the camera. the three.js plane is rotated, we need to rotate the physics plane in cannon.js as well
// cannon.js only supports quaternion with the setFromAxisAngle(...) method
floorBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1, 0, 0),
    Math.PI * 0.5 //quarter rotation
) //put a stick through the object, then provide the angle - awesome analogy

world.addBody(floorBody)

// // EXTRA: FIXME: Wall collision

const wall1Shape = new CANNON.Plane();
const wall1Body = new CANNON.Body();
wall1Body.mass = 0;
wall1Body.addShape(wall1Shape);
wall1Body.position.set(5, 0, 0)
console.log(wall1Body)

world.addBody(wall1Body)

// const wallThickness = 0.1;

// // 1. Create walls

// const wallShapeX = new CANNON.Box(new CANNON.Vec3(5, wallThickness, 5));
// const wallShapeY = new CANNON.Box(new CANNON.Vec3(wallThickness, 5, 5));
// const wallShapeZ = new CANNON.Box(new CANNON.Vec3(5, 5, wallThickness));

// // 2. Define walls position
// const wallPosition1 = new CANNON.Vec3(5, 0, 0);
// const wallPosition2 = new CANNON.Vec3(0, 0, -5);
// const wallPosition3 = new CANNON.Vec3(-5, 0, 0);
// const wallPosition4 = new CANNON.Vec3(0, 0, 5);

// // 3. Create cannon.js bodies
// const wallBody1 = new CANNON.Body({
//     mass: 0, 
//     shape: wallShapeX,
//     position: wallPosition1
// });

// const wallBody2 = new CANNON.Body({
//     mass: 0, 
//     shape: wallShapeZ,
//     position: wallPosition2
// });

// const wallBody3 = new CANNON.Body({
//     mass: 0, 
//     shape: wallShapeX,
//     position: wallPosition3
// });

// const wallBody4 = new CANNON.Body({
//     mass: 0, 
//     shape: wallShapeZ,
//     position: wallPosition4
// });

// wallBody2.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
// wallBody4.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);

// // 4. Add bodies to the world

// world.addBody(wallBody1);
// world.addBody(wallBody2);
// world.addBody(wallBody3);
// world.addBody(wallBody4);


// /**
//  * Test sphere
//  */
// const sphere = new THREE.Mesh(
//     new THREE.SphereGeometry(0.5, 32, 32),
//     new THREE.MeshStandardMaterial({
//         metalness: 0.3,
//         roughness: 0.4,
//         envMap: environmentMapTexture,
//         envMapIntensity: 0.5
//     })
// )
// sphere.castShadow = true
// sphere.position.y = 0.5
// scene.add(sphere)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * EXTRA: Walls
 */

const wallGeometry = new THREE.PlaneGeometry(10, 5);
const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#00ff00',
    metalness: 0.3, 
    roughness: 0.4, 
    envMap: environmentMapTexture,
    envMapIntensity: 0.5, 
    side: THREE.DoubleSide, //double sided walls
    transparent: true,
    opacity: 0.2,

});

const createWall = (position, rotation) => {
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.receiveShadow = true;
    wall.position.copy(position);
    wall.rotation.copy(rotation);
    scene.add(wall)
}

createWall(new THREE.Vector3(0, 2.5, -5), new THREE.Euler(0, 0, 0));
createWall(new THREE.Vector3(-5, 2.5, 0), new THREE.Euler(0, Math.PI / 2, 0));
createWall(new THREE.Vector3(0, 2.5, 5), new THREE.Euler(0, 0, Math.PI));
createWall(new THREE.Vector3(5, 2.5, 0), new THREE.Euler(0, Math.PI / 2, 0));

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Utils
 */

const objectToUpdate = []

// INFO: Sphere

const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture
})

const createSphere = (radius, position) =>
{
    // Three.js mesh
    const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    mesh.scale.set(radius, radius, radius)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

// Cannon.js body

const shape = new CANNON.Sphere(radius)
const body =  new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    // shape: shape =
    shape,
    meterial: defaultMaterial
})
body.position.copy(position)
body.addEventListener('collide', (event) => {
    playBoingSound(event);
});
 //add collision sound
world.addBody(body)


// Save in objects to update
objectToUpdate.push({
    mesh, //mesh: mesh
    body  //body: body
})

}


createSphere(0.5, {x: 0, y: 3, z: 0 }) //the position doesn't have to be a Vector3 or Vec3, just coordinates

//Boxes

const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture
})

const createBox = (width, height, depth, position) =>
{
    // Three.js mesh
    const mesh = new THREE.Mesh(boxGeometry, boxMaterial)
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

// Cannon.js body

const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))
const body =  new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    // shape: shape =
    shape,
    meterial: defaultMaterial
})
body.position.copy(position)

body.addEventListener('collide', playHitSound) //pass the play sound function on the event listener
world.addBody(body)


// Save in objects to update
objectToUpdate.push({
    mesh, //mesh: mesh
    body  //body: body
})

}

createBox(1, 0.5, 0.75, {x: 0, y: 3, z: 0 }) //the position doesn't have to be a Vector3 or Vec3, just coordinates


/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime
    // console.log(deltaTime) //how much of a second was spent since the last tick

    // Update physics world
    // sphereBody.applyForce(new CANNON.Vec3(-0.5, 0, 0), sphereBody.position)

    // INFO: Update physics world
    world.step(1/60, deltaTime, 3) //fixed time step, time passed since last step, how many iterations the world can apply to catch up with potential delay - for potential delay - gafferongames article
                            //1/60 - 60fps - will not affect higher framerate screens
                            // do not use the getDelta() from the Clock class! but deltaTIme instead

    // console.log(sphereBody.position.y)

    // INFO: Update coordinates of the sphereBody 
    // sphere.position.copy(sphereBody.position) //copies the position of another vector 3 - it works inter-libraries, even if our object is vec3, not vector3
    // INFO: Update coordinates of the sphereBody separately -> replaced by the .copy method
    // sphere.position.x = sphereBody.position.x; 
    // sphere.position.y = sphereBody.position.y;
    // sphere.position.z = sphereBody.position.z;

    for ( const object of objectToUpdate) {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion) //boxes rotation on landing
    }
    
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()