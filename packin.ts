import { Octokit } from "octokit"
import * as dotenv from 'dotenv'
import path from 'path'
import { parse } from 'node-html-parser';
import { readFileSync, readdirSync, lstatSync } from 'fs'
import fetch from 'node-fetch'
dotenv.config()

// Point a directory

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

let packageJsonLocationProbable = '';
const searchPackageJson = (dir = process.cwd()) => {
  const files = readdirSync(dir);
  for (const file of files) {
    const absolute = path.join(dir, file)
    if (file === 'node_modules') {
      continue
    }
    if (absolute.includes('package.json')) {
      packageJsonLocationProbable = path.resolve(absolute);
      return;
    }
    if (lstatSync(absolute).isDirectory()) {
      searchPackageJson(absolute)
    }
  }
};
searchPackageJson()
const { Input } = require('enquirer');

const askLocation = new Input({
  name: 'location',
  message: 'What is the absolute path of your package json?'
})

const run = async (absolutePath: string) => {
  if (!absolutePath) {
    absolutePath = await askLocation.run();
  }
  if (!absolutePath.includes('package.json')) console.log('Not sure if this is a package.json but continuing anyway...')
  const dependenciesNPMUrl: string[] = []
  let jsonString = readFileSync(absolutePath);
  const packager = JSON.parse(String(jsonString))
  const dependencies = Object.keys(packager.dependencies)
  dependencies.forEach(dependencies => {
    dependenciesNPMUrl.push(`https://www.npmjs.com/package/${dependencies}`)
  })
  const devDependencies = Object.keys(packager.devDependencies)
  const npmScrapeResult: string[] = [];
  async function buildRepoList(dependenciesArr: string[]) {
    for(let i = 0; i < dependenciesArr.length; i++) {
      const response = await fetch(dependenciesArr[i]);
      const text = await response.text();
      const html = parse(text);
      const githubLink = html.querySelector('#repository-link')?.text
      npmScrapeResult.push(`https://${githubLink!}`)
    }
  }
  let haveYouStarred: string[] = [];
  const githubRepos = await buildRepoList(dependenciesNPMUrl);
  async function checkStarStatus() {
    const repos = await octokit.request('GET /users/wesngu28/starred')
    haveYouStarred = repos.data.map((repo: any) => {return repo.html_url})
    console.log(haveYouStarred)
  }
  const stars = await checkStarStatus()
  const repoNames: string[] = [];
  async function getRepoNames() {
    for (let i = 0; i < npmScrapeResult.length; i++) {
      const testes = npmScrapeResult[i].replace('https://github.com/', '')
      const testeses = testes.split('/')
      const repoResponse = await octokit.request(`GET /repos/${testeses[0]}/${testeses[1]}`)
      repoNames.push(repoResponse.data.name);
    }
  }
  await getRepoNames()
  console.log(repoNames)
  let starStatus = npmScrapeResult.map((dependency, idx) => {
    console.log(dependency)
    if(haveYouStarred.includes(dependency)) {
      console.log(`You have already starred ${repoNames[idx]}`)
    } else {
      console.log(`You have yet to star ${repoNames[idx]}`)
      return dependency;
    }
  })
  starStatus = starStatus.filter(repo => repo !== undefined)
  starStatus.forEach(async (repo) => {
    const testes = repo!.replace('https://github.com/', '')
    const testeses = testes.split('/')
    const starMe = await octokit.request('PUT /user/starred/{owner}/{repo}', {
      owner: testeses[0],
      repo: testeses[1]
    })
    console.log('Starred ' + repo)
  });
  console.log(starStatus)
  console.log(`Your package json is located ${absolutePath}`);
}

run(packageJsonLocationProbable)

// const getAllRepos = async () => {
//   const repos = await octokit.request('GET /users/wesngu28/starred', {
//     username: 'USERNAME'
//   })
//   console.log(repos)
// }

// console.log(getAllRepos())