// Tooltip functionality
const buttons = document.querySelectorAll('.menu button');
const tooltip = document.querySelector('.tooltip');

buttons.forEach(btn => {
   btn.addEventListener('mouseenter', () => {
      tooltip.textContent = btn.getAttribute('data-tooltip');
   });
   btn.addEventListener('mouseleave', () => {
      tooltip.textContent = "";
   });
});
