    document.addEventListener('DOMContentLoaded', () => {
      // DROPDOWN TOGGLE
      const dropdowns = document.querySelectorAll('.dropdown-btn');
      dropdowns.forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          const container = btn.nextElementSibling;
          if (!container) return;
          if (container.style.maxHeight) container.style.maxHeight = null;
          else container.style.maxHeight = container.scrollHeight + "px";
        });
      });

      // ====== YOUR EXISTING DASHBOARD JS GOES HERE ======
      // Products CRUD, Cart, Orders, Checkout, etc.
    });