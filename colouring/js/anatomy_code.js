/* Comments */



var parts = [ //array of the boney bois
    {
        "bone_number": 1,
        "bone": "fovea for ligament of head",
        "correct": "section_1",
        "color": "rgb(255, 255, 255)"
    },
    {
        "bone_number": 2,
        "bone": "iliac fossa",
        "correct": "section_2",
        "color": "rgb(255,102,52)"
    },
    {
        "bone_number": 3,
        "bone": "ala of sacrum",
        "correct": "section_3",
        "color": "rgb(0,153,0)"
    },
    {
        "bone_number": 4,
        "bone": "anterior sacral foramina",
        "correct": "section_4",
        "color": "rgb(0,0,158)"
    },
    {
        "bone_number": 5,
        "bone": "sacro-iliac joint",
        "correct": "section_5",
        "color": "rgb(0,0,158)"
    },
    {
        "bone_number": 6,
        "bone": "pecten pubis",
        "correct": "section_6",
        "color": "rgb(194,0,218)"
    },
    {
        "bone_number": 7,
        "bone": "bony margin of acetabulum",
        "correct": "section_7",
        "color": "rgb(254,184,0)"
    },
    {
        "bone_number": 8,
        "bone": "iliopubic eminence",
        "correct": "section_8",
        "color": "rgb(0,207,63)"
    },
    {
        "bone_number": 9,
        "bone": "pubic tuberde",
        "correct": "section_9",
        "color": "rgb(255,102,0)"
    },
    {
        "bone_number": 10,
        "bone": "coccyx",
        "correct": "section_10",
        "color": "rgb(255,0,204)"
    },
    {
        "bone_number": 11,
        "bone": "obturator foramen",
        "correct": "section_11",
        "color": "rgb(125,126,0)"
    },
    {
        "bone_number": 12,
        "bone": "ischial ramus",
        "correct": "section_12",
        "color": "rgb(255,24,34)"
    },
    {
        "bone_number": 13,
        "bone": "ischial tuberosity",
        "correct": "section_13",
        "color": "rgb(1,125,125)"
    },
    {
        "bone_number": 14,
        "bone": "neck of femur",
        "correct": "section_14",
        "color": "rgb(224,1,58)"
    },
    {
        "bone_number": 15,
        "bone": "shaft of femur",
        "correct": "section_15",
        "color": "rgb(255,255,0)"
    },
    {
        "bone_number": 16,
        "bone": "greater trochanter",
        "correct": "section_16",
        "color": "rgb(169,71,58)"
    },
    {
        "bone_number": 17,
        "bone": "iliac crest",
        "correct": "section_17",
        "color": "rgb(153,254,0)"
    },
    {
        "bone_number": 18,
        "bone": "anterior superior iliac",
        "correct": "section_18",
        "color": "rgb(153,254,0)"
    },
    {
        "bone_number": 19,
        "bone": "lesser trochanter",
        "correct": "section_19",
        "color": "rgb(33,32,2)"
    },
    {
        "bone_number": 20,
        "bone": "anterior inferior iliac spine",
        "correct": "section_20",
        "color": "rgb(53,0,254)"
    }
];


//array of all your section IDs
var arraySectionIDs = ["section_1", "section_2", "section_3", "section_4", "section_5", "section_6", "section_7", "section_8", "section_9", "section_10", "section_11", "section_12", "section_13", "section_14", "section_15", "section_16", "section_17", "section_18", "section_19", "section_20", "section_21", "section_22", "section_23", "section_24", "section_25", "section_26"];


var currentSelectedBone;
var colouring = false;
var currentColor;

for (i=0; i<parts.length; i++) {
    var element = document.getElementById("boneList");
    element.innerHTML += "<p><a href='#!' onClick=\"select(this, '" + parts[i].bone_number + "', '" + parts[i].color + "')\">"+parts[i].bone+"</a><p>";
}

//<p><a href="#!" onClick="select(this, '20', '3500fe')">anterior</a></p>

//select(beans, '20', '3500fe');

// write a function select() which enables colouring and does something

function select(element, bone_number, color) {
    currentColor = color;
    // set currentSelectedBone to bone_number
    currentSelectedBone = bone_number;
    // set the background of the element to color
    element.style.backgroundColor= color;
    // set colouring to true
    colouring = true;

    // for each item in array, add the class that makes it transparent
for (var i = 0; i < arraySectionIDs.length; i++) {
    var element = document.getElementById(arraySectionIDs[i]);
    element.classList.add("invisibleClass");
    if (colouring && !element.classList.contains("selectedClass") && !element.classList.contains("correctClass")) {
     element.style = "fill: " + currentColor;
    }
    
}



}



// for each item in array, add the class that makes it transparent
for (let i = 0; i < arraySectionIDs.length; i++) {
    var element = document.getElementById(arraySectionIDs[i]);
    element.classList.add("invisibleClass");


    // on click, run the function on the selected item
    element.addEventListener('click', function (e) {
        if (colouring && !e.target.parentElement.classList.contains("correctClass")) {
            setClicks(e, i);
        }
    });
}

// function to prepare the sections for interactivity
function setClicks(e, index) {
    var element = document.getElementById(arraySectionIDs[index]);
    element.style.fill=currentColor;


    if (element.classList.contains("selectedClass")) {
        element.classList.remove("selectedClass");
    } else {
        var selectedItems = document.getElementsByClassName("selectedClass");
        
        for (var i = 0; i < selectedItems.length; i++){
                selectedItems[i].classList.remove("selectedClass");
        }
        element.classList.add("selectedClass");
    }


}




document.getElementById("checker").addEventListener("click", check);

function check() {
    var selectedItems = document.getElementsByClassName("selectedClass");

    for (var i = 0; i < selectedItems.length; i++) {

        // get the id of what has been coloured
        var clicked = selectedItems[i].id
        console.log("coloured bone id", clicked);


        if(clicked != "section_21" && clicked != "section_22" && clicked != "section_23" && clicked != "section_24" && clicked != "section_25" &&clicked != "section_26"){

        //look inside of parts, find the `correct` value of the selected bone
        var test = (parts.find(element => element.correct == clicked));

            if (selectedItems[i].style.fill == test.color){
                //add a class of 'correctClass' to the element classList
                selectedItems[i].classList.add("correctClass");
            };

        }





            selectedItems[i].classList.remove("selectedClass");
    }




}