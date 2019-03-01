function httpCreate(word) {

}

function save(_word) {
  const word = {
    ..._word,
    siblings: [..._word.siblings] || [],
    children: [..._word.children] || []
  };
  
}
