// add wishlist sweet alert//
function add_to_wishlist(proId) {
  $.ajax({
    url: "/addToWishList/" + proId,
    method: "get",
    success: (response) => {
      if (response.added) {
        Swal.fire({
          position: "top-center",
          icon: "success",
          title: "Added to your wishlist",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Already exist!",
          footer: '<a href="/wishlist">Go wishlist?</a>',
        });
      }
    },
  });
}

// single product image chages//
function change_image(image) {
  var container = document.getElementById("main-image");
  container.src = image.src;
}
document.addEventListener("DOMContentLoaded", function (event) {});

// product remove from cart alert//

let button = document.querySelector(".button");
// change productCount from cart//
function changeProCount(cartId, proId, stock, count) {
  // let button = document.getElementById("minus" + cartId);
  let proCount = parseInt(document.getElementById(proId).innerHTML);
  // const button = document.querySelector(".minus");

  if (count == -1 && proCount == 1) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Sorry Minimam count is 1",
    });
    // button.disabled = true;
  } else {
    if (proCount + count <= stock) {
      $.ajax({
        url: "/change-product-proCout",
        data: {
          cart: cartId,
          product: proId,
          count: count,
          proCount: proCount,
        },
        method: "post",

        success: (response) => {
          if (response.removeProduct) {
            alert("Product Removed From Cart");
            location.reload();
          } else {
            $("#cartNum").load(location.href + " #cartNum");

            // document.getElementById(proId).InnerHTML = proCount + count
          }
        },
      });
    } else {
      Swal.fire("Out Of Stock?", "can't add more", "oops");
    }
  }
}
// remove product from wish//
function removeProduct(wishId, proId) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't to remove this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes,  it!",
  })
    .then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: "/remove_wishPro",
          data: {
            product: proId,
            wishList: wishId,
          },
          method: "post",
          success: (response) => {},
        });
        Swal.fire("Deleted!", "Your file has been deleted.", "success");
      }
    })
    .then(() => {
      location.reload();
    });
}
