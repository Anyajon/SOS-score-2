const gasUrl = "https://script.google.com/macros/s/AKfycbw8DZGydDsXnEvuIu7FAXarO2qsCxbAOCaPh5bUBNRfznbYU9i9JakzzuxwKz5kp_daXg/exec";

// 1. ฟังก์ชันสลับขั้นตอน (Step 1, Step 2, Step 3) ภายใน App 1
function switchStep(stepId) {
    ['step-1', 'step-2', 'step-3'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(stepId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

// 2. ฟังก์ชันแสดงนาฬิกา real-time
function updateClock() {
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        const now = new Date();
        clockEl.innerText = now.toLocaleString('th-TH', { 
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
    }
}
setInterval(updateClock, 1000);
updateClock();

// 3. ค้นหาข้อมูลผู้ป่วยจากเลขเตียง
function searchByRoom() {
    const room = document.getElementById('roomInput').value;
    if (!room) return Swal.fire('โปรดระบุเลขห้อง');
    
    Swal.fire({ title: 'กำลังดึงข้อมูล...', didOpen: () => Swal.showLoading() });
    
    fetch(`${gasUrl}?action=getPatient&room=${room}`)
        .then(res => res.json())
        .then(p => {
            Swal.close();
            if (p && p.hn) {
                document.getElementById('nameInput').value = p.name;
                document.getElementById('hnInput').value = p.hn;
            } else {
                Swal.fire('เตียงว่าง', 'ไม่มีข้อมูลผู้ป่วยในเตียงนี้', 'info');
            }
        }).catch(() => Swal.fire('ผิดพลาด', 'ไม่สามารถดึงข้อมูลได้', 'error'));
}

// 4. ตรวจสอบข้อมูลก่อนไป Step 2
function goToStep2() {
    const name = document.getElementById('nameInput').value;
    const hn = document.getElementById('hnInput').value;
    if (!name || !hn) return Swal.fire('ระบุชื่อและ HN ให้ครบถ้วน');

    document.getElementById('summaryPatientName').innerText = `ผู้ป่วย: ${name}`;
    document.getElementById('summaryPatientHN').innerText = `HN: ${hn}`;
    switchStep('step-2');
}

// 5. คำนวณ SOS Score อัตโนมัติ
let currentScore = 0;
function calcScore() {
    let s = 0;
    
    // Temp
    const temp = parseFloat(document.getElementById('temp').value);
    if (!isNaN(temp)) {
        if (temp <= 35 || temp >= 38.5) s += 2;
        else if (temp <= 36 || (temp >= 38.1 && temp <= 38.4)) s += 1;
    }

    // SBP
    const sbp = parseFloat(document.getElementById('sbp').value);
    if (!isNaN(sbp)) {
        if (sbp <= 80) s += 3;
        else if (sbp <= 90 || sbp >= 200) s += 2;
        else if (sbp <= 100 || (sbp >= 181 && sbp <= 199)) s += 1;
    }

    // Pulse
    const p = parseFloat(document.getElementById('pulse').value);
    if (!isNaN(p)) {
        if (p <= 40 || p >= 140) s += 3;
        else if (p >= 121 && p <= 139) s += 2;
        else if ((p >= 41 && p <= 50) || (p >= 101 && p <= 120)) s += 1;
    }

    // RR
    const rr = parseFloat(document.getElementById('rr').value);
    if (!isNaN(rr)) {
        if (rr <= 8 || rr >= 35) s += 3;
        else if (rr >= 26 && rr <= 34) s += 2;
        else if (rr >= 21 && rr <= 25) s += 1;
    }

    // Urine
    const u = parseFloat(document.getElementById('urine').value);
    if (document.getElementById('urine').value !== "") {
        if (u <= 160) s += 2;
        else if (u <= 319) s += 1;
    }

    // Conscious
    s += parseInt(document.getElementById('con').value);

    currentScore = s;
    document.getElementById('totalScoreDisplay').innerText = s;
}

// 6. บันทึกข้อมูลลง Google Sheets แล้วแสดงหน้าแนวทางดูแล (Step 3)
function saveAndGoToStep3() {
    const payload = {
        room: document.getElementById('roomInput').value,
        name: document.getElementById('nameInput').value,
        hn: document.getElementById('hnInput').value,
        temp: document.getElementById('temp').value,
        sbp: document.getElementById('sbp').value,
        pulse: document.getElementById('pulse').value,
        rr: document.getElementById('rr').value,
        con: document.getElementById('con').options[document.getElementById('con').selectedIndex].text,
        urine: document.getElementById('urine').value,
        totalScore: currentScore
    };

    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', didOpen: () => Swal.showLoading() });

    fetch(gasUrl, { method: "POST", body: JSON.stringify(payload) })
        .then(() => {
            Swal.close();
            renderGuidelines(currentScore);
            switchStep('step-3');
        })
        .catch(() => Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error'));
}

// 7. แสดงข้อความแนวทางการปฏิบัติงานตามคะแนน SOS
function renderGuidelines(score) {
    document.getElementById('finalScore').innerText = score;
    const circle = document.getElementById('resultCircle');
    const text = document.getElementById('finalRiskText');
    const list = document.getElementById('guidelinesList');

    let steps = [];
    if (score >= 4) {
        circle.className = "w-24 h-24 mx-auto rounded-full flex flex-col items-center justify-center font-black text-2xl shadow-inner bg-red-500 text-white";
        text.innerText = "ความเสี่ยงสูง (High Risk)";
        text.className = "font-bold text-sm text-red-600";
        steps = [
            "1. รายงานแพทย์ประจำวอร์ด/แพทย์ผู้ดูแลทันที",
            "2. ติดตามสัญญาณชีพอย่างใกล้ชิดทุก 15-30 นาที",
            "3. ประเมินอาการตาม Sepsis Guideline หากสงสัยการติดเชื้อ",
            "4. เตรียมอุปกรณ์ช่วยเหลือฉุกเฉินข้างเตียง",
            "5. บันทึกปริมาณน้ำเข้า-ออก (I/O) อย่างเคร่งครัด"
        ];
    } else if (score >= 1) {
        circle.className = "w-24 h-24 mx-auto rounded-full flex flex-col items-center justify-center font-black text-2xl shadow-inner bg-amber-400 text-slate-800";
        text.innerText = "ความเสี่ยงปานกลาง (Moderate Risk)";
        text.className = "font-bold text-sm text-amber-600";
        steps = [
            "1. รายงานพยาบาล In-charge เพื่อประเมินซ้ำ",
            "2. ติดตามและบันทึกสัญญาณชีพทุก 4 ชั่วโมง",
            "3. ทบทวนแผนการรักษาและการให้ยาของผู้ป่วย",
            "4. ประเมินอาการเปลี่ยนแปลงทางคลินิกอย่างใกล้ชิด"
        ];
    } else {
        circle.className = "w-24 h-24 mx-auto rounded-full flex flex-col items-center justify-center font-black text-2xl shadow-inner bg-emerald-100 text-emerald-600";
        text.innerText = "ไม่เสี่ยง / ความเสี่ยงต่ำ (Low Risk)";
        text.className = "font-bold text-sm text-emerald-600";
        steps = [
            "1. ประเมินและบันทึกสัญญาณชีพตามเวรปกติ (ทุก 8 ชั่วโมง)",
            "2. ให้การดูแลตามแผนการรักษามาตรฐาน"
        ];
    }

    list.innerHTML = steps.map(s => `<div class="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700">${s}</div>`).join('');
}

// 8. ดึงประวัติการบันทึกย้อนหลังตาม HN
function searchHistory() {
    const hn = document.getElementById('hnInput').value;
    if (!hn) return Swal.fire('ระบุ HN เพื่อดูประวัติ');
    
    fetch(`${gasUrl}?hn=${hn}`).then(r => r.json()).then(data => {
        const sec = document.getElementById('historySection');
        sec.classList.remove('hidden');
        let h = '';
        data.forEach(r => { 
            h += `<div class="p-2 bg-slate-50 rounded-xl flex justify-between"><span>${r[0]}</span><span class="font-bold">Score: ${r[10]}</span></div>`; 
        });
        document.getElementById('historyBody').innerHTML = h || 'ไม่พบประวัติ';
    });
}
function checkOfflineData() {
        const queue = JSON.parse(localStorage.getItem('sos_offline_queue') || "[]");
        if (queue.length > 0 && navigator.onLine) {
            Swal.fire({
                title: 'พบข้อมูลค้างส่ง!',
                text: `คุณมีข้อมูล ${queue.length} รายการที่บันทึกช่วงออฟไลน์ ต้องการซิงค์ขึ้นระบบเลยไหม?`,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'ส่งข้อมูล',
                cancelButtonText: 'ไว้ทีหลัง'
            }).then(res => { if(res.isConfirmed) syncOffline(queue); });
        }
}
    function syncOffline(queue) {
        if (queue.length === 0) { 
            localStorage.removeItem('sos_offline_queue'); 
            return Swal.fire('สำเร็จ', 'ซิงค์ข้อมูลออฟไลน์ทั้งหมดแล้ว', 'success'); 
        }
        const item = queue.shift();
        fetch(gasUrl, { method: "POST", body: JSON.stringify(item) })
            .then(() => syncOffline(queue))
            .catch(() => Swal.fire('ผิดพลาด', 'การซิงค์หยุดชะงัก โปรดลองใหม่อีกครั้ง', 'error'));
    }

    function resetForm() {
        document.getElementById('sosForm').reset();
        calcScore();
    }

    function showAdmitForm() { 
        document.getElementById('nameInput').focus(); 
    }
    </script>
</body>
</html>
