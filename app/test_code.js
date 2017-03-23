function validateEmail() {
	// Clear any previous messages
	var fieldmsg = document.getElementById('fieldmsg');
	fieldmsg.style.display = 'none';
	fieldmsg.classList.remove('fieldmsg-error');
	fieldmsg.classList.remove('fieldmsg-info');
	
	var input = document.getElementById('email');
	var email = String(input.value);

	// Check for input
	if (!email)
		return;

	// Ensure input is lowercase
	var lowercase = email.toLowerCase();
	if (email != lowercase) {
		input.value = lowercase;
		email = lowercase;
	}

	// Validate input
	if (email.match(/^s[0-9]{7}\@student\.rmit\.edu\.au$/) != null) {
		fieldmsg.classList.add('fieldmsg-info');
		fieldmsg.innerHTML = 'Valid RMIT student email address';
		
	} else if (email.match(/^[a-z]+\.[a-z]+\@rmit\.edu\.au$/) != null) {
		fieldmsg.classList.add('fieldmsg-info');
		fieldmsg.innerHTML = 'Valid RMIT staff email address';
	} else {
		fieldmsg.classList.add('fieldmsg-error');
		fieldmsg.innerHTML = 'Invalid RMIT email address';
	}
	fieldmsg.style.display = 'block';
}