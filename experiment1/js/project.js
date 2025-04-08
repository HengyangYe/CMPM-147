// project.js - purpose and description here
// Author: Your Name
// Date:

// NOTE: This is how we might start a basic JavaaScript OOP project

// Constants - User-servicable parts
// In a longer project I like to put these in a separate file

// define a class
class MyProjectClass {
  // constructor function
  constructor(param1, param2) {
    // set properties using 'this' keyword
    this.property1 = param1;
    this.property2 = param2;
  }
  
  // define a method
  myMethod() {
    // code to run when method is called
  }
}

function main() {
  // create an instance of the class
  let myInstance = new MyProjectClass("value1", "value2");

  // call a method on the instance
  myInstance.myMethod();
}

// let's get this party started - uncomment me
// Random‑Starship Generator
const fillers = {
  wings: [
    "Delta-wing", "Forward-swept", "Gull-wing", "Oblique pivot", "X-wing",
    "Canard fins", "Solar-sail foldables", "Inverted-V", "Ring pylon",
    "Morphing feather", "Split-scissor", "Cyclone rotors"
  ],
  hull: [
    "Saucer core", "Needle prow", "Cigar fuselage", "Arrowhead wedge",
    "Spherical pod", "Ring-torus", "Segmented lattice", "Organic carapace",
    "Stealth shard", "Box freighter", "Crystal prism", "Fractal spiral"
  ],
  role: [
    "Interceptor", "Heavy fighter", "Exploration scout", "Colony transport",
    "Mining barge", "Rescue shuttle", "Jump-jet courier", "Medical frigate",
    "Gunship", "Stealth bomber", "Survey drone-mothership"
  ],
  equipment: [
    "Twin railguns", "Plasma turrets", "Missile pods", "Graviton beam",
    "Point-defense lasers", "EMP cannons", "Drone bay", "Quantum jammer",
    "Kinetic gauss battery", "Shield projectors", "Nanite repair swarm",
    "Holographic decoys"
  ]
};

const template = `🚀  Presenting the $role-class starship!

• Hull: $hull
• Wing configuration: $wings
• Primary equipment: $equipment

Prepare for launch beyond the frontier!`;

// STUDENTS: You don't need to edit code below this line.

const slotPattern = /\$(\w+)/;

function replacer(match, name) {
  let options = fillers[name];
  if (options) {
    return options[Math.floor(Math.random() * options.length)];
  } else {
    return `<UNKNOWN:${name}>`;
  }
}

function generate() {
  let story = template;
  while (story.match(slotPattern)) {
    story = story.replace(slotPattern, replacer);
  }

  /* global box */
  box.innerText = story;
}

/* global clicker */
clicker.onclick = generate;

generate();
