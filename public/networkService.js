const getJSON = (url) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      const status = xhr.status;
      if (status === 200) {
        resolve(xhr.response);
      } else {
        reject(status, xhr.response);
      }
    };
    xhr.send();
  })
}

module.exports = { getJSON }
