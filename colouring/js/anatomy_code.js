/* Comments */

var currentSelectedBone;
var colouring = false;



var parts = [ //array of the boney bois
    {
        "bone": "Test bone",
        "correct": "section_1"
    }
]



// create list of all the bone items, add event listeners to start colouring. Colouring = true, change styles as needed, etc.

colouring = true;



//array of all your section IDs
var arraySectionIDs = ["section_1", "section_2", "section_3", "section_4", "section_5", "section_6", "section_7", "section_8", "section_9", "section_10", "section_11", "section_12", "section_13", "section_14", "section_15", "section_16", "section_17", "section_18", "section_19", "section_20", "section_21", "section_22", "section_23", "section_24", "section_25", "section_26"];

// for each item in array, add the class that makes it transparent
for (let i = 0; i < arraySectionIDs.length; i++) {
    var element = document.getElementById(arraySectionIDs[i]);
    element.classList.add("invisibleClass");


    // on click, run the function on the selected item
    element.addEventListener('click', function (e) {
        if (colouring) {
            BollocksTest(e, i);
        }
    });

}


function BollocksTest(e, index) { // Note: Please name your functions more meaningfully
    var element = document.getElementById(arraySectionIDs[index]);

    if (element.classList.contains("selected")) {
        element.classList.remove("selected");
    } else {
        element.classList.add("selected");
    }

}

document.getElementById("checker").addEventListener("click", check);

function check() {
    var selectedItems = document.getElementsByClassName("selected");
    for (var i = 0; i < selectedItems.length; i++) {
        console.log(selectedItems[i].id);
        console.log(parts.find(element => element.correct == selectedItems[i].id));
    }

}