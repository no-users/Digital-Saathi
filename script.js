let cropper;
const API_KEY = 'QnsDa3AogfoC8w5jqB4ShNz9';

// Clock updates
setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleString();
}, 1000);

// Image Upload
document.getElementById('upload').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = () => {
        const img = document.getElementById('mainImage');
        img.src = reader.result;
        if(cropper) cropper.destroy();
        cropper = new Cropper(img, { viewMode: 1, dragMode: 'move' });
    };
    reader.readAsDataURL(e.target.files[0]);
};

// 1. Passport Size Auto-Set
function setPassport() {
    cropper.setAspectRatio(3.5 / 4.5);
}

// 2. Realistic Signature
document.getElementById('sigUpload').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = () => {
        const sig = document.createElement('img');
        sig.src = reader.result;
        sig.className = 'sig-overlay';
        sig.style.width = "120px";
        document.getElementById('editor-container').appendChild(sig);
        makeDraggable(sig);
    };
    reader.readAsDataURL(e.target.files[0]);
};

// 3. Size Control Logic (Iterative Compression)
async function finalDownload() {
    const canvas = cropper.getCroppedCanvas();
    const targetKB = document.getElementById('targetKB').value;
    let quality = 0.95;
    let blob;

    // Loop to reach target size
    do {
        blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
        quality -= 0.05;
    } while (blob.size / 1024 > targetKB && quality > 0.1);

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ApnaAgency_Photo_${targetKB}kb.jpg`;
    link.click();
}

// 4. Print Layout Generator (6/12)
function generatePrint(count) {
    const canvas = cropper.getCroppedCanvas();
    const printCanvas = document.createElement('canvas');
    const ctx = printCanvas.getContext('2d');

    // A4 Size @ 300DPI
    printCanvas.width = 2480;
    printCanvas.height = 3508;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    const imgW = 413; // 3.5cm
    const imgH = 531; // 4.5cm
    
    let x = 150, y = 150;
    for(let i=0; i<count; i++) {
        ctx.drawImage(canvas, x, y, imgW, imgH);
        x += imgW + 60;
        if(x > 2000) { x = 150; y += imgH + 80; }
    }

    const link = document.createElement('a');
    link.href = printCanvas.toDataURL('image/jpeg', 1.0);
    link.download = `Print_Sheet_${count}.jpg`;
    link.click();
}

// Draggable Helper
function makeDraggable(el) {
    let x = 0, y = 0;
    el.onmousedown = (e) => {
        x = e.clientX; y = e.clientY;
        document.onmousemove = (e) => {
            el.style.left = (el.offsetLeft - (x - e.clientX)) + "px";
            el.style.top = (el.offsetTop - (y - e.clientY)) + "px";
            x = e.clientX; y = e.clientY;
        };
        document.onmouseup = () => document.onmousemove = null;
    };
}