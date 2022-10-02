#!/usr/bin/env npx ts-node

import { Octokit } from "octokit"
import * as dotenv from 'dotenv'
import path from 'path'
import { parse } from 'node-html-parser';
import { readFileSync, readdirSync, lstatSync } from 'fs'
import fetch from 'node-fetch'
const { Input, Confirm  } = require('enquirer');

dotenv.config()

// Point a directory

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

const searchPackageJson = (dir = process.cwd(), packageJsonLocation: string = '') => {
  const files = readdirSync(dir);
  for (const file of files) {
    const absolute = path.join(dir, file)
    if (file === 'node_modules') {
      continue
    }
    if (absolute.includes('package.json')) {
      packageJsonLocation = path.resolve(absolute)
    }
    if (lstatSync(absolute).isDirectory()) {
      searchPackageJson(absolute, packageJsonLocation)
    }
  }
  return packageJsonLocation
};

const buildRepoList = async (dependencies: string[]) => {
  const repoList = dependencies.map(async(dependency: string)=> {
    const response = await fetch(dependency);
    const text = await response.text();
    const html = parse(text);
    return html.querySelector('#repository-link')?.text
  })
  return await Promise.all(repoList);
}

const checkStarStatus = async () => {
  const repos = await octokit.request('GET /users/wesngu28/starred')
  const starredRepoList = repos.data.map((repo: any) => {return repo.html_url})
  return starredRepoList;
}

const getRepoNames = async (ghrepoLinks: string[]) => {
  const repoNames = ghrepoLinks.map(async(repo: string) => {
    const authorSlashRepo = repo.replace('https://github.com/', '')
    const split = authorSlashRepo.split('/')
    const repoResponse = await octokit.request(`GET /repos/${split[0]}/${split[1]}`)
    return repoResponse.data.name
  })
  return await Promise.all(repoNames)
  // for (let i = 0; i < ghrepoLinks.length; i++) {
  //   const testes = ghrepoLinks[i].replace('https://github.com/', '')
  //   const testeses = testes.split('/')
  //   const repoResponse = await octokit.request(`GET /repos/${testeses[0]}/${testeses[1]}`)
  //   repoNames.push(repoResponse.data.name);
  // }
}
const packageJsonLocation = searchPackageJson(process.cwd())


const askUsePackage = new Confirm({
  name: 'existingPackage',
  message: 'A package.json was detected in your current folder. Would you like to use it?'
})

const askLocation = new Input({
  name: 'location',
  message: 'What is the absolute path of your package json?'
})

const askPermission = new Confirm({
  name: 'question',
  message: 'Would you like to confirm each package before starring?'
})

const run = async (absolutePath: string) => {
  if (absolutePath) {
    const usePackage = await askUsePackage.run();
    if (!usePackage) {
      absolutePath = await askLocation.run();
    }
  } else {
    absolutePath = await askLocation.run();
  }
  const perm: boolean = await askPermission.run();
  if (!absolutePath.includes('package.json')) console.log('Not sure if this is a package.json but continuing anyway...')
  const dependenciesNPMUrl: string[] = []
  let jsonString = readFileSync(absolutePath);
  const packager = JSON.parse(String(jsonString))
  const dependencies = Object.keys(packager.dependencies)
  dependencies.forEach(dependencies => {
    dependenciesNPMUrl.push(`https://www.npmjs.com/package/${dependencies}`)
  })
  const devDependencies = Object.keys(packager.devDependencies)
  devDependencies.forEach(devDependency => {
    dependenciesNPMUrl.push(`https://www.npmjs.com/package/${devDependency}`)
  })
  const githubRepos = await buildRepoList(dependenciesNPMUrl);
  const starredRepos = await checkStarStatus()
  const repoNames = await getRepoNames(starredRepos)
  console.log(starredRepos)
  const starStatus = githubRepos.map((dependency, idx) => {
    const append = `https://${dependency}`
    console.log(append)
    if(starredRepos.includes(append!)) {
      console.log(`You have already starred ${repoNames[idx]}`)
    } else {
      console.log(`You have yet to star ${repoNames[idx]}`)
      return append;
    }
  })
  let filteredStarStatus = starStatus.filter(repo => repo !== undefined)
  const removeDuplicate = [...new Set(filteredStarStatus)];
  filteredStarStatus = Array.from(removeDuplicate)
  for (const repo of filteredStarStatus) {
    console.log(repo)
    const authorSlashRepo = repo!.replace('https://github.com/', '')
    const split = authorSlashRepo.split('/')
    console.log(split)
    if(perm) {
      const askStar = new Confirm({
        name: 'question',
        message: `Would you like to star ${split[1]} by ${split[0]}`
      })
      const confirmation = await askStar.run()
      if(confirmation) {
        const starMe = await octokit.request('PUT /user/starred/{owner}/{repo}', {
          owner: split[0],
          repo: split[1]
        })
        console.log('Starred ' + repo)
      }
    } else {
      const starMe = await octokit.request('PUT /user/starred/{owner}/{repo}', {
        owner: split[0],
        repo: split[1]
      })
      console.log('Starred ' + repo)
    }
  }
  console.log(starStatus)
  console.log(`Your package json is located ${absolutePath}`);
}
console.log(packageJsonLocation)
run(packageJsonLocation!)

// const getAllRepos = async () => {
//   const repos = await octokit.request('GET /users/wesngu28/starred', {
//     username: 'USERNAME'
//   })
//   console.log(repos)
// }

// console.log(getAllRepos())