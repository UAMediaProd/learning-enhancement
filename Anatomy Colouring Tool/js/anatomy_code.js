/* Comments */
    
var valCurrentSelectedBone; 
var item;



var parts =[ //array of the boney bois
    {
        "bone": "Illiac crest",
        "correct": "section-00"
    },
    {
        "bone": "Illiac crest",
        "correct": "section-00"
    },
]



//array of all your section IDs
var arraySectionIDs = ["section_1", "section_2", "section_3", "section_4", "section_5", "section_6", "section_7", "section_8", "section_9", "section_10", "section_11", "section_12", "section_13", "section_14", "section_15", "section_16", "section_17", "section_18", "section_19", "section_20", "section_21", "section_22", "section_23", "section_24", "section_25"]; 
console.log(arraySectionIDs);

console.log(document.getElementById("section_1"));

// for each item in array, add the class that makes it transparent
for (let i = 0; i < arraySectionIDs.length; i++) { 
    console.log(arraySectionIDs[i]);
    var element = document.getElementById(arraySectionIDs[i]);
    console.log(element);
    element.classList.add("invisibleClass");
   
    // also set up an eventListener of type click
}



    /* var item = getElementById(array[i]);
    item.addEventListener('click',function(e){

        // what should happen when the student clicks on an area?
        // use e to see the event item - should give you the target ID

        console.log(e);

    }); */