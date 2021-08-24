$(document).ready(function () {
//load functions
})


// butt functions

function check(deets, id, posID) {

  //use extraData if present, otherwise use existing data

  deets = deets || data;
  id = id || '#tipAlert';
  posID = posID || '#posAlert';

  console.log("check");
  console.log(deets);

  var answer = '';
  $("textarea").each(function(){
    console.log(this.value);
    answer += this.value + " ";
  });


  // let answer = $('#answerBox').val();
  console.log(answer);
  let doc = nlp(answer)
  //grab the contractions

  console.log(deets[0].keyWords);
  for(index in deets[0].keyWords) {
    let keyword = deets[0].keyWords[index];
    console.log(keyword.word);

    if(doc.has(keyword.word)) {
      keyword.found = true;
    }
  }

  var feedbackHTML = '<ul class="list">';

  
  console.log(deets[0].keyWords);
  var foundCount = 0;
  for (index in deets[0].keyWords) {
    let keyword = deets[0].keyWords[index];
    if(keyword.found){
      foundCount++;
    }

    if(!keyword.found) {
      console.log("Not found");
      if(feedbackHTML.replace(/<[^>]*>?/gm, '').indexOf(keyword.feedback) == -1){

        feedbackHTML += "<li>" + keyword.feedback + " </li>";
      }
    }



  }

  feedbackHTML += '</ul>';
  $(id + " > #tipText").html(feedbackHTML);
  if(foundCount == deets[0].keyWords.length) {
   $(posID).show(); 
   $(id).hide();
  } else {
  $(posID).hide(); 
  $(id).show();
}

  //enable buttons
}

function reset(id) {
  id = id || '#answerBox';
  $(id).val('')
}

function moveOn(link){

  console.log(link);
  Swal.fire({
    title: 'Ready to move on?',
    text: "Your work here won't be saved, make sure you've copied your answers somewhere else to use in your final submission",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, I\'m ready'
  }).then((result) => {
    if (result.value) {
      Swal.fire({
        title: 'Well done!',
        html: `
        You can find the next clue here:<br/><br/>
        <a href="` + link + `">Go to the next Clue</a>
      `,
        icon: 'success'
      })
    }
  })
}