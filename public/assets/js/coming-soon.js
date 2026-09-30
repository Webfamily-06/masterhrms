/*
Author       : Dreams Technologies
Template Name: Dreams ERP - Time Tracking Boostrap 5 Admin Dashboard
*/
(function () {
    "use strict";

	// Coming Soon
	const comingSoonPage = document.querySelector('.comming-soon-pg');
	if (comingSoonPage) {
		const day = comingSoonPage.querySelector('.days');
		const hour = comingSoonPage.querySelector('.hours');
		const minute = comingSoonPage.querySelector('.minutes');
		const second = comingSoonPage.querySelector('.seconds');

		function setCountdown() {
			const countdownDate = new Date('Oct 30, 2026 16:00:00').getTime();

			const updateCount = setInterval(function () {
				const todayDate = new Date().getTime();
				const distance = countdownDate - todayDate;

				if (distance < 0) {
					clearInterval(updateCount);
					comingSoonPage.innerHTML = '<h1>EXPIRED</h1>';
					return;
				}

				const days = Math.floor(distance / (1000 * 60 * 60 * 24));
				const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
				const seconds = Math.floor((distance % (1000 * 60)) / 1000);

				if (day) day.textContent = String(days).padStart(2, '0');
				if (hour) hour.textContent = String(hours).padStart(2, '0');
				if (minute) minute.textContent = String(minutes).padStart(2, '0');
				if (second) second.textContent = String(seconds).padStart(2, '0');
			}, 1000);
		}

		setCountdown();
	}

})();