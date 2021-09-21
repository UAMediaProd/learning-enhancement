//-------Setting Up Variables-----------

// An array containing a list of objects which each contain the number of the bone, the name of the bone, it's correct section and it's highlight color
var arrayBoneParts = [
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
        "color": "rgb(255, 102, 52)"
    },
    {
        "bone_number": 3,
        "bone": "ala of sacrum",
        "correct": "section_3",
        "color": "rgb(0, 153, 0)"
    },
    {
        "bone_number": 4,
        "bone": "anterior sacral foramina",
        "correct": "section_4",
        "color": "rgb(0, 0, 158)"
    },
    {
        "bone_number": 5,
        "bone": "sacro-iliac joint",
        "correct": "section_5",
        "color": "rgb(145, 23, 254)"
    },
    {
        "bone_number": 6,
        "bone": "pecten pubis",
        "correct": "section_6",
        "color": "rgb(194, 0, 218)"
    },
    {
        "bone_number": 7,
        "bone": "bony margin of acetabulum",
        "correct": "section_7",
        "color": "rgb(254, 184, 0)"
    },
    {
        "bone_number": 8,
        "bone": "iliopubic eminence",
        "correct": "section_8",
        "color": "rgb(0, 207, 63)"
    },
    {
        "bone_number": 9,
        "bone": "pubic tuberde",
        "correct": "section_9",
        "color": "rgb(255, 102, 0)"
    },
    {
        "bone_number": 10,
        "bone": "coccyx",
        "correct": "section_10",
        "color": "rgb(255, 0, 204)"
    },
    {
        "bone_number": 11,
        "bone": "obturator foramen",
        "correct": "section_11",
        "color": "rgb(125, 126, 0)"
    },
    {
        "bone_number": 12,
        "bone": "ischial ramus",
        "correct": "section_12",
        "color": "rgb(255, 24, 34)"
    },
    {
        "bone_number": 13,
        "bone": "ischial tuberosity",
        "correct": "section_13",
        "color": "rgb(1, 125, 125)"
    },
    {
        "bone_number": 14,
        "bone": "neck of femur",
        "correct": "section_14",
        "color": "rgb(224, 1, 58)"
    },
    {
        "bone_number": 15,
        "bone": "shaft of femur",
        "correct": "section_15",
        "color": "rgb(255, 255, 0)"
    },
    {
        "bone_number": 16,
        "bone": "greater trochanter",
        "correct": "section_16",
        "color": "rgb(169, 71, 58)"
    },
    {
        "bone_number": 17,
        "bone": "iliac crest",
        "correct": "section_17",
        "color": "rgb(153, 254, 0)"
    },
    {
        "bone_number": 18,
        "bone": "anterior superior iliac",
        "correct": "section_18",
        "color": "rgb(226, 240, 23)"
    },
    {
        "bone_number": 19,
        "bone": "lesser trochanter",
        "correct": "section_19",
        "color": "rgb(33, 32, 2)"
    },
    {
        "bone_number": 20,
        "bone": "anterior inferior iliac spine",
        "correct": "section_20",
        "color": "rgb(53, 0, 254)"
    }
];

// Array of all section_IDs
var arraySectionIDs = ["section_1", "section_2", "section_3", "section_4", "section_5", "section_6", "section_7", "section_8", "section_9", "section_10", "section_11", "section_12", "section_13", "section_14", "section_15", "section_16", "section_17", "section_18", "section_19", "section_20", "section_21", "section_22", "section_23", "section_24", "section_25", "section_26"];

var boolIsColoring = false; // If the user has selected a colour, this variable is True. It will only be False before anyone has selected a colour, and after the 'Check' button has been clicked.
var RGBcurrentColor; // A variable to store the RGB value of the currently selected bone's colour.

//-------Setting Up the Initial Page-----------

// Sets up all the selectable bone options as clickable objects. This is an example of the HTML link that is generated: <a href="#!" onClick="funcSelectBone(this, '1', 'rgb(255,255,255)')">boneName</a>
for (i = 0; i < arrayBoneParts.length; i++) {
    var element = document.getElementById("boneList");
    element.innerHTML += "<p><a href='#!' onClick=\"funcSelectBone(this, '" + arrayBoneParts[i].color + "')\">" + arrayBoneParts[i].bone + "</a></p>";
}

// For each object in arraySectionIDs array, add a class that makes it transparent.
for (let i = 0; i < arraySectionIDs.length; i++) {
    var element = document.getElementById(arraySectionIDs[i]);
    element.classList.add("invisibleClass");

    // We also set up an EventListener  on click, run the function on the selected item
    element.addEventListener('click', function (clickEventData) {
        if (boolIsColoring && !clickEventData.target.parentElement.classList.contains("correctClass")) {
            funcRevealFill(i);
        }
    });
}

// Prepares the Check Button
document.getElementById("checker").addEventListener("click", funcCheckProgress);

//-------Functions-----------

// Function to write a function funcSelectBone() which enables colouring and does something
function funcSelectBone(element, color) {
    RGBcurrentColor = color;
    // Set the background of the bone selection option to it's assigned colour
    element.style.backgroundColor = color;
    // set colouring to True, because we have now selected a bone option
    boolIsColoring = true;

    // Because of complexities with the MouseOver event, we do something different... Everytime we select a bone option, we set ALL bone part sections on the image to that colour. However, since they are all invisible, the only one that appears is the one that's being hovered over; thus seeming to change only that colour when you hover over it!
    for (var i = 0; i < arraySectionIDs.length; i++) {
        var element = document.getElementById(arraySectionIDs[i]);
        if (boolIsColoring && !element.classList.contains("selectedClass") && !element.classList.contains("correctClass")) {
            element.style = "fill: " + RGBcurrentColor;
        }
    }
}

// Function that reveals the selected bone segment on the image and adds the associated classes. * Note - The segments are already coloured, we just need to reveal them.
function funcRevealFill(index) {
    var element = document.getElementById(arraySectionIDs[index]);
    var selectedItems = document.getElementsByClassName("selectedClass");

    // Applies the appropriate classes to each bone segment as it is clicked on - or removes it if you're clicking it again
    if (element.classList.contains("selectedClass")) {
        element.classList.remove("selectedClass");
    } else {
        for (var i = 0; i < selectedItems.length; i++) {
            if (selectedItems[i].style.fill == RGBcurrentColor) {
                selectedItems[i].classList.remove("selectedClass");
            }
        }
        element.classList.add("selectedClass");
    }
}

// Function to check the progress of what bone segments you've gotten correct and what you have gotten wrong. This function will also reset any of the incorrect bones segments, but leave the correct ones as they are. It also adds a 'Correct' class to the segment, indicating that it can't be reset or even changed to a different colour.
function funcCheckProgress() {

    //This line is essentially the same as GetElementID, but works slightly differently. <bit hazy on the details>
    var colouredInSegments = document.querySelectorAll(".selectedClass");
    var numCorrect = 0;

    //We go through each segment that has been coloured in (no need to check the ones that have not been)
    for (var i = 0; i < colouredInSegments.length; i++) {

        // Get the id of what has been coloured
        var clickedID = colouredInSegments[i].id;

        //If it ISN'T a grey section (ie, not a valid part), then we check to see if it is a correct element
        if (clickedID != "section_21" && clickedID != "section_22" && clickedID != "section_23" && clickedID != "section_24" && clickedID != "section_25" && clickedID != "section_26") {

            // Looks inside of arrayBoneParts, finds the `correct` value of the selected bone
            var test = (arrayBoneParts.find(element => element.correct == clickedID));

            // If it is a correct selection, we assign the 'CorrectClass' to it, meaning it can't ever be unselected
            if (colouredInSegments[i].style.fill == test.color) {
                colouredInSegments[i].classList.add("correctClass");
                colouredInSegments[i].classList.remove("selectedClass");
                numCorrect++;
            } 
        }
        colouredInSegments[i].classList.remove("selectedClass");
    }
        
    document.getElementById('countryBody').innerHTML = "<p>So far, you've gotten " + numCorrect + " of the bone segments correct.</p></br> The incorrect ones have been removed for you to give it another try.";
    $('#CountryModal').modal();
}