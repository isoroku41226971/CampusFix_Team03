// Browser-side required-field check for the report form (WD-14).
// Shows the same messages as the server so users get feedback without a round trip.
// The server still validates every submission (src/validation.js).
(function () {
  var form = document.getElementById('report-form');
  if (!form) return;

  var messages = {
    title: '請填寫標題',
    location: '請選擇地點',
    category: '請選擇類別',
    description: '請填寫描述',
  };

  function showError(name, message) {
    var field = form.elements[name];
    var box = document.getElementById(name + '-error');
    if (message) {
      box.textContent = message;
      box.hidden = false;
      field.setAttribute('aria-invalid', 'true');
    } else {
      box.textContent = '';
      box.hidden = true;
      field.removeAttribute('aria-invalid');
    }
  }

  function check(name) {
    var empty = form.elements[name].value.trim() === '';
    showError(name, empty ? messages[name] : '');
    return !empty;
  }

  form.addEventListener('submit', function (event) {
    var firstInvalid = null;
    Object.keys(messages).forEach(function (name) {
      if (!check(name) && !firstInvalid) firstInvalid = form.elements[name];
    });
    if (firstInvalid) {
      event.preventDefault();
      firstInvalid.focus();
    }
  });

  // Clear a field's message as soon as it is filled in.
  Object.keys(messages).forEach(function (name) {
    var field = form.elements[name];
    var eventName = field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(eventName, function () {
      if (field.getAttribute('aria-invalid') === 'true') check(name);
    });
  });
})();
