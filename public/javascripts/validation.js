$(document).ready(function () {
  $("#user-login-form").validate({
    rules: {
      Email: {
        required: true,
        email: true,
      },
      Password: {
        required: true,
        minlength: 4,
      },
    },
  });
});
$(document).ready(function () {
  $("#user-signup-form").validate({      
    rules: {
      Name: {
        required: true,
        minlength: 3,
      },
      Email: {
        required: true,
        email: true,
      },
      Password: {
        required: true,
        minlength: 4,
      },
      MobNumber: {
        required: true,
        minlength: 10,
        maxlength: 10,
      },
    },
  });
});
$(document).ready(() => {
  $("#admin-login-form").validate({
    rules: {
      Email: {
        required: true,
        email: true,
      },
      Password: {
        required: true,
        minlength: 4,
      },
    },
  });
});
