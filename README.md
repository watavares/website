# watavares.com

Personal website and portfolio of Andre Tavares, cloud engineer.

The site is run like a production system: static site on Azure Static Web Apps, infrastructure in Terraform, deployed by GitHub Actions with OIDC (no stored secrets).

## Plan

- [ ] Site: hero, story, projects (ChargeNet case study), experience, skills, certifications, writing, contact
- [ ] Live projects strip: real-time figures from the [ChargeNet](https://github.com/watavares/chargenet) status API
- [ ] Visitor counter: Azure Function + Table Storage
- [ ] Infrastructure: Azure Static Web Apps (Free tier) in Terraform
- [ ] Pipeline: build, preview environments per pull request, deploy on merge
- [ ] Custom domain: `watavares.com` moved from Hostinger hosting to Azure (DNS stays at Hostinger)
