document.getElementById('form').onsubmit = async (e) => {
e.preventDefault();

const form = e.target;

const data = {
name: form.name.value,
lat: parseFloat(form.lat.value),
lng: parseFloat(form.lng.value),
rating: parseFloat(form.rating.value),
image: form.image.value
};

await fetch('/api/shops', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(data)
});

alert('등록 완료');
};