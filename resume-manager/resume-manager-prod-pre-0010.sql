PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_init_job_search_core.sql','2026-07-19 07:09:45');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_add_cover_letters.sql','2026-07-19 13:53:17');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0003_add_resume_ai_context.sql','2026-07-20 05:58:57');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0004_auth_foundation.sql','2026-07-20 06:00:05');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0005_totp_foundation.sql','2026-07-20 06:50:47');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0006_add_user_display_name.sql','2026-07-20 08:14:29');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0007_explicit_ownership.sql','2026-07-20 08:31:30');
CREATE TABLE resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
INSERT INTO "resumes" ("id","user_id","name","notes","created_at","updated_at") VALUES('7fd5fba3-1c81-46f4-82e3-02c7efdce710','dev-user-default-123','Executive Cybersecurity Leader Resume','Updated leadership focused resume','2026-07-19T07:26:13.557Z','2026-07-19T14:43:07.671Z');
CREATE TABLE resume_versions (
    id TEXT PRIMARY KEY,
    resume_id TEXT NOT NULL,
    version_label TEXT NOT NULL,
    target_role TEXT,
    r2_object_key TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, ai_context TEXT,
    FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
);
INSERT INTO "resume_versions" ("id","resume_id","version_label","target_role","r2_object_key","is_active","created_at","ai_context") VALUES('b52f8a31-5bcc-479b-aa6a-79157161a6da','7fd5fba3-1c81-46f4-82e3-02c7efdce710','Default Version','CISO/IT Leadership','resumes/dev-user-default-123/7fd5fba3-1c81-46f4-82e3-02c7efdce710/b52f8a31-5bcc-479b-aa6a-79157161a6da/4ddb0c64-dc85-4413-ab4d-b86a69374dd6.pdf',1,'2026-07-19T07:35:05.443Z',replace('PROFESSIONAL PROFILE\nIT and Cybersecurity leader with 25+ years of experience in enterprise IT operations, security governance, and risk management within global environments. Expertise in cloud (AWS, Azure) and cybersecurity initiatives, including ISO/IEC 27001:2022 ISMS implementation.\n\nTARGET ROLE POSITIONING\nCybersecurity & IT Leadership roles focused on enterprise operations, risk management, and security governance.\n\nLEADERSHIP & SCOPE\n- Experience directing enterprise IT and cybersecurity operations for organizations with user bases ranging from 150 to 300+ users.\n- Oversight of operations across 7 global locations (Toradex Systems).\n- Responsibility for managing budgets, including a directed $0.5M IT budget (Yodlee Inc).\n- Experience in vendor management and internal controls across 20+ third-party vendors.\n\nCORE EXPERTISE\n- Governance, Risk, and Compliance: ISO/IEC 27001:2022, NIST CSF, GRC, ISMS, IT Audits, Vendor Risk Management, BCP/DR.\n- Security Operations & Infrastructure: Vulnerability Management, Incident Response, SIEM, EDR/XDR, ELK Stack, Security Awareness Training, Microsoft 365 Security.\n- Cloud, Infrastructure & IT Service Management: AWS, Azure, Cloud Security, Virtualization, Network Administration, ITIL.\n- Management & Strategy: IT Strategy, Vendor Management, Budget Management, Stakeholder Management.\n\nKEY ACHIEVEMENTS\n- Spearheaded ISO/IEC 27001:2022 transformation and certification.\n- Mitigated organizational risk exposure by 25% across 5 global business units.\n- Reduced phishing and impersonation risks by 25%+ through implementation of SPF, DKIM, DMARC, and Mimecast.\n- Achieved 95% remediation of critical vulnerabilities within 48 hours via EDR/XDR deployment.\n- Slashed AWS compute costs by 10% and overall IT operating costs by 15% while maintaining 99%+ system availability.\n- Lowered potential BCP/DR recovery time by 30% through quarterly reviews.\n- Successfully migrated 10+ server racks with zero downtime.\n\nTECHNOLOGIES & PLATFORMS\nAWS, Azure, Microsoft 365, Zoom Phone, EDR/XDR platforms, ELK Stack, SPF, DKIM, DMARC, Mimecast.\n\nSECURITY & GOVERNANCE\nISO/IEC 27001:2022, ISO 9001, ITIL frameworks, NIST CSF, BCP/DR, GRC.\n\nCERTIFICATIONS\n- CISM (Certified Information Security Manager)\n- CCISO (Certified Chief Information Security Officer)\n- ISO/IEC 27001:2022 Lead Auditor\n- ITIL® Foundation in IT Service Management\n- IT Disaster Recovery Specialist\n- CEH (Certified Ethical Hacker)\n\nCAREER FACTS & CONSTRAINTS\n- Experience: 25+ years.\n- Primary Geographic Scope: India and United States.\n- Educational Background: Master of Computer Applications (MCA) and Bachelor of Science in Computer Science.\n\nIMPORTANT EVIDENCE\n- 25+ years experience.\n- 170-300+ user/employee scope.\n- 7 global locations.\n- 20+ third-party vendors managed.\n- 25% risk exposure mitigation.\n- 25%+ reduction in phishing/impersonation risk.\n- 10% reduction in AWS compute costs; 15% reduction in IT operating costs.\n- 99%+ system availability maintained.\n- 95% remediation of critical vulnerabilities within 48 hours.\n- 30% lower potential recovery time (BCP/DR).\n- 10+ server racks migrated.\n- $0.5M IT budget directed.\n- 5+ open-source solutions adopted (decreasing costs by >10%).','\n',char(10)));
CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    website TEXT,
    location TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
);
INSERT INTO "companies" ("id","user_id","name","website","location","notes","created_at") VALUES('d86cced1-7dc4-4635-a377-b042902babea','dev-user-default-123','Toradex','https://www.toradex.com','Switzerland','Previous employer','2026-07-19T07:44:22.691Z');
INSERT INTO "companies" ("id","user_id","name","website","location","notes","created_at") VALUES('c46ae749-99f0-4fa8-87bb-daae0fe178fa','dev-user-default-123','Nextenti Tech Private Limited',NULL,NULL,NULL,'2026-07-20T05:31:34.688Z');
INSERT INTO "companies" ("id","user_id","name","website","location","notes","created_at") VALUES('9447e93f-1db3-4067-94be-892d2d6bbed8','dev-user-default-123','Brigade Group',NULL,NULL,NULL,'2026-07-21T15:21:10.812Z');
INSERT INTO "companies" ("id","user_id","name","website","location","notes","created_at") VALUES('a9fd4748-1c77-422a-b454-56df1fa961d4','dev-user-default-123','Solvemtum',NULL,NULL,NULL,'2026-07-21T15:28:07.897Z');
INSERT INTO "companies" ("id","user_id","name","website","location","notes","created_at") VALUES('e91b3649-f735-4b3c-9dfa-fb28ffa8222b','dev-user-default-123','bcompanies.in',NULL,NULL,NULL,'2026-07-22T07:55:46.109Z');
CREATE TABLE opportunities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    resume_version_id TEXT,
    job_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONSIDERING',
    priority INTEGER NOT NULL DEFAULT 3 CHECK(priority >= 1 AND priority <= 5),
    application_url TEXT,
    date_identified TEXT,
    date_applied TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
    FOREIGN KEY (resume_version_id) REFERENCES resume_versions (id) ON DELETE SET NULL
);
INSERT INTO "opportunities" ("id","user_id","company_id","resume_version_id","job_title","status","priority","application_url","date_identified","date_applied","notes","created_at","updated_at") VALUES('21acc2a1-2ab1-4038-ba3d-f8f79fd6b396','dev-user-default-123','c46ae749-99f0-4fa8-87bb-daae0fe178fa','b52f8a31-5bcc-479b-aa6a-79157161a6da','General Manager – Information Security Officer','CONSIDERING',3,NULL,'2026-07-20',NULL,NULL,'2026-07-20T05:31:34.786Z','2026-07-20T05:31:34.786Z');
INSERT INTO "opportunities" ("id","user_id","company_id","resume_version_id","job_title","status","priority","application_url","date_identified","date_applied","notes","created_at","updated_at") VALUES('32d7f0af-374b-4f15-a460-6532f9631fff','dev-user-default-123','9447e93f-1db3-4067-94be-892d2d6bbed8','b52f8a31-5bcc-479b-aa6a-79157161a6da','Associate General Manager- IT','CONSIDERING',3,'https://www.linkedin.com/jobs/view/4442587455/','2026-07-21','2026-07-21',NULL,'2026-07-21T15:21:11.234Z','2026-07-22T07:56:30.300Z');
INSERT INTO "opportunities" ("id","user_id","company_id","resume_version_id","job_title","status","priority","application_url","date_identified","date_applied","notes","created_at","updated_at") VALUES('2dd3ce04-2caa-4556-bee0-d7d4426c9538','dev-user-default-123','a9fd4748-1c77-422a-b454-56df1fa961d4','b52f8a31-5bcc-479b-aa6a-79157161a6da','APA IT Infrastructure Manager','APPLIED',3,NULL,'2026-07-21',NULL,NULL,'2026-07-21T15:28:08.341Z','2026-07-21T15:28:16.048Z');
INSERT INTO "opportunities" ("id","user_id","company_id","resume_version_id","job_title","status","priority","application_url","date_identified","date_applied","notes","created_at","updated_at") VALUES('51e0280f-a44d-495a-ab38-7474abb67648','dev-user-default-123','e91b3649-f735-4b3c-9dfa-fb28ffa8222b','b52f8a31-5bcc-479b-aa6a-79157161a6da','IT Director','APPLIED',3,'https://www.linkedin.com/jobs/view/4443553285/','2026-07-22','2026-07-22',NULL,'2026-07-22T07:55:46.346Z','2026-07-22T07:56:10.016Z');
CREATE TABLE job_descriptions (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL UNIQUE,
    raw_text TEXT NOT NULL,
    extracted_skills TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE
);
INSERT INTO "job_descriptions" ("id","opportunity_id","raw_text","extracted_skills","created_at") VALUES('d049fb6d-6532-407c-a3cc-921651cfed94','21acc2a1-2ab1-4038-ba3d-f8f79fd6b396',replace('We are looking for an experienced General Manager – Information Security Officer to lead enterprise-wide Information and Cyber Security initiatives for our client one of the largest corporate healthcare groups in India with hospitals in Telangana, Andhra Pradesh & Maharashtra providing multi-disciplinary integrated healthcare services, with a focus on tertiary and quaternary healthcare at affordable cost. This executive leadership role will be responsible for defining the organization''s cybersecurity strategy, strengthening security governance, managing cyber risks, ensuring regulatory compliance, and building a high-performing security function.\n\n\nKey Responsibilities:\n\nDefine and execute the organization''s Information & Cyber Security strategy.\nLead security governance, risk management, compliance, and incident response.\nDevelop and maintain security policies aligned with industry standards and regulatory requirements.\nOversee Security Operations, Security Architecture, IAM, SIEM, Cloud Security, and Vulnerability Management.\nDrive cybersecurity awareness and continuous improvement across the organization.\nPartner with business leaders, technology teams, vendors, and executive stakeholders to deliver secure digital transformation.\nLead and mentor a high-performing Information Security team.\nRequired Experience:\n\n15+ years of IT experience with significant leadership experience in Information/Cyber Security.\nProven track record of implementing enterprise security programs and driving security transformation.\nExperience managing security governance, risk, compliance, audits, and large security teams.\nStrong stakeholder management skills with exposure to executive leadership.\nRequired Knowledge:\n\nInformation Security frameworks such as ISO 27001, COBIT, NIST, and Cyber Essentials.\nRegulatory and compliance standards including DPDP Act, IT Act, NABH, ABDM, HIPAA, and PCI DSS.\nSecurity technologies including Firewalls, IDS/IPS, IAM, SIEM, Cloud Security, and Application Security.\nPreferred Certifications:\n\nCISSP\nCISM\nCISA\nFull membership of the Institute of Information Security\nProfessionals','\n',char(10)),NULL,'2026-07-20T05:31:34.848Z');
INSERT INTO "job_descriptions" ("id","opportunity_id","raw_text","extracted_skills","created_at") VALUES('2cdb26c5-9922-4327-a231-6d06a54a1755','32d7f0af-374b-4f15-a460-6532f9631fff',replace('About the job\nOversee the design management of IT across our new hotels. \n In-charge of all IT procurement for new hotels including software/hardware etc \n Drive Digital Transformation / Other Innovation across portfolio including AI \n Manage and Drive Digital / IT initiatives across the new organisation with proper escalation management \n Team Mentoring, Operational Guidance and dedicated point of contact during major outages \n Help in taking strategic and financial decisions in IT Asset Procurement, Cyber security, Compliances, Vendor Selections and R&D \n Provide Technical Solution/ Architecture advisory on New Initiatives and IT System Design \n Drive the IT Roadmap for the new organisation \n Chalk out training pathway well in time for outsourced agencies to use our systems \n\nBenefits\n\n Value add to Design management including Value Engineering \n Dedicated IT leader, with clear set priorities \n Improved turn around time on decision making, with dedicated IT Expert in house. \n Better System Architecture and Design for New Entities \n Better support on Cyber Security and IT Governance \n Better managing and monitoring of IT assets, support to the existing entities for critical decision making. \n Better technical support to the procurement team during IT asset purchases.','\n',char(10)),NULL,'2026-07-21T15:21:11.523Z');
INSERT INTO "job_descriptions" ("id","opportunity_id","raw_text","extracted_skills","created_at") VALUES('22ad30ba-2fe1-4815-8d54-e0c31d52341b','2dd3ce04-2caa-4556-bee0-d7d4426c9538',replace('At Solventum, we enable better, smarter, safer healthcare to improve lives. As a new company with a long legacy of creating breakthrough solutions for our customers’ toughest challenges, we pioneer game-changing innovations at the intersection of health, material and data science that change patients'' lives for the better while enabling healthcare professionals to perform at their best. Because people, and their wellbeing, are at the heart of every scientific advancement we pursue. \n\nWe partner closely with the brightest minds in healthcare to ensure that every solution we create melds the latest technology with compassion and empathy. Because at Solventum, we never stop solving for you.\n\nThe Impact You’ll Make in this Role\n\nAs the APA IT Infrastructure Manager for Solventum sites, you will be responsible for delivering and supporting IT technology and infrastructure for multiple sites and plants across multiple countries in the Asia Pacific region. The APA Infrastructure Manager will work with regional infrastructure teams, global product teams, managed service partners, and India GCC Infrastructure resources to deliver IT services.\n\nSupported countries include, but are not limited to: Australia, India, Japan, Korea, Malaysia, Singapore, New Zealand, Thailand, Taiwan, and Vietnam . Working as part of the Global IT Infrastructure Team, the successful candidate will lead and manage a geographically distributed regional infrastructure organization, including direct reports across multiple countries and matrixed Global Capability Center resources, to deliver end‑to‑end infrastructure services aligned with global strategy.\n\nThis position is accountable for managing all Infrastructure implementations, deployments, and support within the region, ensuring sites within local countries are in compliance with Solventum corporate policies and strategic direction. This role includes direct people management responsibility for a regional team of infrastructure leaders, in addition to dotted‑line functional leadership of India GCC infrastructure resources\n\nKey Responsibilities\n\nAs an APA IT Infrastructure Manager, you will have the opportunity to tap into your curiosity and collaborate with some of the most innovative and diverse people around the world. Here, you will make an impact by:\n\nManaging the overall Regional IT Infrastructure and related services to ensure performance meets technical requirements and business expectations across APA.\nProviding IT leadership, consultation, and direction to regional stakeholders while aligning with global infrastructure strategies and standards.\nDetermining direction, priorities, and resourcing for the APA Infrastructure portfolio with full accountability for outcomes.\nPlanning and executing efficient and effective delivery of infrastructure improvements and regional projects, including:\nPlanning and project management\nPrioritization management\nResource management (human and financial)\nService delivery management\nRisk mitigation\nPeople development\nIndia GCC – Dotted‑Line Leadership Responsibilities\n\nProviding dotted‑line functional leadership for Infrastructure staff based in the India Global Capability Center (GCC).\nSupporting priorities, work intake, and delivery expectations for GCC Infrastructure resources.\nPartnering closely with GCC people managers to support performance feedback, capability development, workload balancing, and regional focus.\nEnsuring consistent execution of Solventum infrastructure standards, operating procedures, and service quality across locally based and GCC‑supported teams.\nLeveraging the GCC model to drive scalability, resiliency, and cost‑effective delivery while maintaining a strong customer mindset.\n\nYour Skills And Expertise\n\nTo set you up for success in this role from day one, Solventum requires (at a minimum) the following qualifications:Bachelor''s degree or higher from an accredited university or job experience equivalent.\n\nMinimum fifteen (15) years of professional IT experience\nMinimum five (5) years of managing Global teams\n\nAdditional qualifications that could help you succeed even further in this role include:\n\nMinimum three (3) years of financial management, including budgeting, forecasting and reacting to circumstances\nSolid understanding of Agile principals\nSolid understanding of IT processes and organization\nExperience working in a regulated environment (Works Councils)\nCross-functional IT expertise (applications, security, network and database infrastructure)\nExcellent written and verbal communication skills\nDemonstrated ability to create effective and engaging communications\nExcellent interpersonal and team collaboration skills\nCustomer service mindset and sense of urgency','\n',char(10)),NULL,'2026-07-21T15:28:08.652Z');
INSERT INTO "job_descriptions" ("id","opportunity_id","raw_text","extracted_skills","created_at") VALUES('106d3786-296e-486b-928f-da349620093e','51e0280f-a44d-495a-ab38-7474abb67648',replace('We are looking for an experienced IT Director to oversee all IT (Information Technology) functions in our company. You will be in charge of a team of IT managers and manage the company’s technology operations and the implementation of new IT systems and policies.\n\nAn excellent IT director is very knowledgeable in IT and computer systems. They have a solid technical background while able to manage and motivate people. The ideal candidate will be experienced in creating and implementing IT policies and systems that will meet objectives.\n\nThe goal is to ensure IT systems and people are effective and functioning within the limits of budget, time and specifications of the company.\n\nResponsibilities\n\nOversee all technology operations (e.g. network security) and evaluate them according to established goals\nDevise and establish IT policies and systems to support the implementation of strategies set by upper management\nAnalyze the business requirements of all departments to determine their technology needs\nPurchase efficient and cost-effective technological equipment and software\nInspect the use of technological equipment and software to ensure functionality and efficiency\nIdentify the need for upgrades, configurations or new systems and report to upper management\nCoordinate IT managers and supervise computer scientists, technicians and other professionals to provide guidance\nControl budget and report on expenditure\nAssist in building relationships with vendors and creating cost-efficient contracts','\n',char(10)),NULL,'2026-07-22T07:55:46.485Z');
CREATE TABLE ats_analysis (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    resume_version_id TEXT NOT NULL,
    match_score INTEGER NOT NULL CHECK(match_score >= 0 AND match_score <= 100),
    missing_keywords TEXT,
    skill_gaps TEXT,
    improvement_suggestions TEXT,
    analyzed_at TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
    FOREIGN KEY (resume_version_id) REFERENCES resume_versions (id) ON DELETE CASCADE
);
CREATE TABLE interviews (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    round_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    interview_date TEXT NOT NULL,
    interviewer_names TEXT,
    preparation_notes TEXT,
    questions_asked TEXT,
    feedback_notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE
);
CREATE TABLE cover_letters (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    CONSTRAINT fk_cover_letters_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_cover_letters_status
        CHECK (status IN ('DRAFT', 'FINAL')),

    CONSTRAINT uq_cover_letters_user_company
        UNIQUE (user_id, company_id)
);
INSERT INTO "cover_letters" ("id","user_id","company_id","title","content","status","created_at","updated_at") VALUES('2bf8c5b4-27f0-4364-9a7c-05a5e06ee519','dev-user-default-123','d86cced1-7dc4-4635-a377-b042902babea','Cover Letter - Toradex',replace('Dear Hiring Manager, I am writing to express my interest in opportunities at Toradex. My experience spans global IT operations, cybersecurity governance, cloud infrastructure and ISO 27001.\n\nThank You,\n\nRegards,\n\nKrishna M S','\n',char(10)),'FINAL','2026-07-19T13:59:30.157Z','2026-07-19T14:11:12.911Z');
CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('ADMIN', 'USER')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DISABLED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
, display_name TEXT, is_owner INTEGER NOT NULL DEFAULT 0 CHECK(is_owner IN (0, 1)));
INSERT INTO "users" ("id","email","password_hash","role","status","created_at","updated_at","display_name","is_owner") VALUES('dev-user-default-123','krishna.ms@gmail.com','pbkdf2_sha256$100000$8d07d91ffe22a9178de4aaf3e220ceb7$c96e1d7f7a0af7f7044ce76f10128c32c57835269d78a153eee8b75c2f4a3335','ADMIN','ACTIVE','2026-07-20T06:34:43.924Z','2026-07-20 08:31:30','Krishna M S',1);
INSERT INTO "users" ("id","email","password_hash","role","status","created_at","updated_at","display_name","is_owner") VALUES('e8989dea-ad1e-432d-9d08-6573a9539662','msksharma@yahoo.com','pbkdf2_sha256$100000$ca4ef3d9b98acd1972cb8cc3cd647d2c$f35195f8bda6f75cd1a3aab0fd95a81c243a79fec8277606fcde964cdd934ed6','USER','ACTIVE','2026-07-20T13:06:32.400Z','2026-07-20T13:06:32.400Z','Test User',0);
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO "sessions" ("token_hash","user_id","created_at","last_activity_at","expires_at") VALUES('6774a56fb64db64b6c102e15a381959050f264d773ab72293944cef4543629a8','dev-user-default-123','2026-07-20T07:05:27.596Z','2026-07-20T07:05:27.596Z','2026-07-21T07:05:27.596Z');
INSERT INTO "sessions" ("token_hash","user_id","created_at","last_activity_at","expires_at") VALUES('8beeeaedc86a0d04b1ff843a13b7c4c4be0b013d76b6038fdc64c6dbfa6abb28','dev-user-default-123','2026-07-20T07:24:40.311Z','2026-07-20T07:24:40.311Z','2026-07-21T07:24:40.311Z');
INSERT INTO "sessions" ("token_hash","user_id","created_at","last_activity_at","expires_at") VALUES('5079341fa1244fa6584a60df2614699494e90d1f05b3deb3aa5b7c343c2e5c67','dev-user-default-123','2026-07-20T08:06:48.225Z','2026-07-20T08:06:48.225Z','2026-07-21T08:06:48.225Z');
CREATE TABLE totp_secrets (
    user_id TEXT PRIMARY KEY NOT NULL,
    encrypted_secret TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1)),
    created_at TEXT NOT NULL,
    verified_at TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO "totp_secrets" ("user_id","encrypted_secret","is_verified","created_at","verified_at","updated_at") VALUES('dev-user-default-123','v1$1636e13daacddff9c612601e$a05b55aca77ea7d8299327ebd741b67e30c3e1bc5d0649e6b1e9a2eb19ba49c1499b15070cca17b6a56082b31801327b',1,'2026-07-20T07:06:40.260Z','2026-07-20T07:21:52.614Z','2026-07-20T07:21:52.614Z');
CREATE TABLE mfa_login_challenges (
    challenge_hash TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE outreach_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    contact_date TEXT NOT NULL,
    person_name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    channel TEXT NOT NULL CHECK(channel IN ('LINKEDIN', 'WHATSAPP', 'EMAIL', 'PHONE', 'REFERRAL', 'OTHER')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO "outreach_logs" ("id","user_id","contact_date","person_name","company","email","channel","notes","created_at","updated_at") VALUES('a5a0db52-20d1-49f1-842c-c18cef38331f','dev-user-default-123','2026-07-21','Test Name','Test Company','xyz@test.com','WHATSAPP','Test User','2026-07-21T04:14:54.218Z','2026-07-21T04:17:47.301Z');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',7);
CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_companies_user ON companies(user_id);
CREATE INDEX idx_opportunities_user ON opportunities(user_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_opportunities_date_applied ON opportunities(date_applied);
CREATE INDEX idx_resume_versions_parent ON resume_versions(resume_id);
CREATE INDEX idx_interviews_opportunity ON interviews(opportunity_id);
CREATE INDEX idx_interviews_date ON interviews(interview_date);
CREATE INDEX idx_ats_analysis_lookup ON ats_analysis(opportunity_id, resume_version_id);
CREATE INDEX idx_cover_letters_company_id
ON cover_letters(company_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
CREATE UNIQUE INDEX idx_users_single_owner
ON users(is_owner)
WHERE is_owner = 1;
CREATE INDEX idx_mfa_login_challenges_user
    ON mfa_login_challenges(user_id);
CREATE INDEX idx_mfa_login_challenges_expiry
    ON mfa_login_challenges(expires_at);
CREATE INDEX idx_outreach_logs_user_date
    ON outreach_logs(user_id, contact_date DESC);
