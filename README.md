# Team Infraweb
## Entry for AEC Hackathon, February 2024 in Zurich
## Members
Lukas Fuhrimann, Lukas Merz, Adam Mounsey Timothy Sandy, Moritz Niebler, Ewa Lenart, Soroush Garivani, Tomasz Basinski, Mateusz Płoszaj-Mazurek, Nizar Taha, Szabolcs Veress and Goswin Rothenthal

![infra](https://github.com/opensource-construction/infraweb/assets/17218693/ed198531-9e38-4829-937f-841c86e08ef0)


## Challenge
https://github.com/Tugark/infraweb
Main goal: Web-application to navigate along an axis and create 2D-Sections that can be visualized and exported directly in the browser.

## Deployment

Due to issues with the Github pages actions not being able to use node 20, we're using `gh-pages`. You need to run `npm deploy` (while being a maintainer of the project) and it will build the stuff locally and deploy it. Once the actions are fixed, we can switch to actual pipelines.
