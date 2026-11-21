# Erdenet Youth Hub

A Mongolian-language hackathon demo for finding extracurricular clubs in Erdenet and managing student enrollment. The project uses React, Vite, Tailwind CSS, and Lucide React.

## Run locally

Use Node.js 22.13 or a newer supported release and npm. Open a terminal in this folder and run:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the **Local** URL printed by Vite, usually `http://127.0.0.1:5173`. On macOS or Linux, use `npm` instead of `npm.cmd`.

To build and preview the production bundle:

```powershell
npm.cmd run build
npm.cmd run preview
```

The build writes the client to `dist/client/` and the hosted Worker to `dist/server/index.js`. Local dev and preview use the same SQLite database under `.local-data/`. Their separate default ports give each port its own browser profile selection.

## Two-minute demo

1. Pick **Багш** and create a teacher profile using made-up details. Publish a club under **Дугуйлан нийтлэх**. Enter `0` for free tuition and set capacity to `1` to demonstrate the full state.
2. Open the same site in a different browser or private window and choose **Сурагч**. Create a student profile, find the published club, and click **Бүртгүүлэх**. **Багшийн утас** shows the teacher's registered phone number in the class details and under **Миний бүртгэл**. The six starter listings show labeled placeholder phone numbers.
3. Switch back to **Багш**. Open **Сурагчдын жагсаалт** under the published club to see the student's name, age, grade, and phone number.
4. Refresh to check persistence. To create or switch between additional local profiles, open the profile menu beside the role switch. A second student will see a capacity-one club as full.

## Data and source

The public site shares classes and enrollments through its D1 database. Open student and teacher dashboards refresh their data periodically. The browser stores the access key for each profile, and the server checks that key before accepting registrations or giving a teacher access to a roster. Keep using the same browser profile to manage the classes you published. Use fictional student and teacher information for the hackathon demo.

If you published a class in the earlier browser-only version, refresh and open **Багш** in the original browser so the app can upload that class. The six starter listings, names, and schedules are illustrative.

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | Role gate, registration, profile switching, and application state |
| `src/StudentDashboard.jsx` | Catalog, filters, details, and enrollment |
| `src/TeacherDashboard.jsx` | Class publishing and enrollment rosters |
| `src/data.js`, `src/api.js` | Sample clubs, browser profiles, and shared API calls |
| `server/api.js`, `drizzle/` | Catalog, enrollment, and roster API with database migrations |
| `src/styles.css`, `src/*Dashboard.css` | Tailwind CSS entry, shared styling, and dashboard layouts |
| `public/images/` | Local JPEG artwork used by the app |

## Artwork

The photos are illustrative artwork generated with the built-in image tool. The landing image prompt requested documentary-style photography of four Mongolian teen friends at a neighborhood basketball court in Erdenet, with forested hills, afternoon light, and no text. The catalog prompt requested a six-tile editorial contact sheet showing basketball, painting, language learning, programming and robotics, volleyball, and dance in Erdenet. Each tile was cropped and saved as a separate local JPEG.
