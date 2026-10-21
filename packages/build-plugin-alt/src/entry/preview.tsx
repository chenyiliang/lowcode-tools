import { createRoot } from 'react-dom/client';
import React, { useState } from 'react';
import Loading from '@alifd/next/lib/loading';
import { buildComponents, assetBundle, AssetList, AssetLevel, AssetLoader } from '@alilc/lowcode-utils';
import ReactRenderer from '@alilc/lowcode-react-renderer';
import { SAVE_KEY } from './universal/utils';

const SamplePreview = () => {
  const [data, setData] = useState({} as any);

  async function init() {
    interface StoredPackage {
      package: string;
      library?: string;
      urls?: string[];
      renderUrls?: string[];
    }
    const packages: StoredPackage[] = JSON.parse(window.localStorage.getItem('packages') || '[]');
    const projectSchema = JSON.parse(window.localStorage.getItem(SAVE_KEY)!);
    const { componentsMap: componentsMapArray, componentsTree } = projectSchema;
    const componentsMap: any = {};
    componentsMapArray.forEach((component: any) => {
      componentsMap[component.componentName as string] = component;
    });
    const schema = componentsTree[0];
    console.info('componentsMap is :', componentsMapArray);
    console.info('schema from storage is :', schema);

    const libraryMap: Record<string, string> = {};
    const libraryAsset: AssetList = [];
    packages.forEach(({ package: pkg, library, urls, renderUrls }) => {
      if (library) {
        libraryMap[pkg] = library;
      }
      if (renderUrls) {
        libraryAsset.push(renderUrls);
      } else if (urls) {
        libraryAsset.push(urls);
      }
    });

    const vendors = [
      assetBundle(libraryAsset, AssetLevel.Library),
    ];
    console.log('libraryMap&vendors', libraryMap, vendors);

    // TODO asset may cause pollution
    const assetLoader = new AssetLoader();
    await assetLoader.load(libraryAsset);
    const components = buildComponents(libraryMap, componentsMap, () => null);
    console.log('components', components);

    setData({
      schema,
      components,
    });
  }

  const { schema, components } = data;

  if (!schema || !components) {
    init();
    return <Loading fullScreen />;
  }

  return (
    <div className="lowcode-plugin-sample-preview">
      {/*@ts-ignore*/}
      <ReactRenderer className="lowcode-plugin-sample-preview-content" schema={schema} components={components} />
    </div>
  );
};

const container = document.getElementById('ice-container');
if (container) {
  createRoot(container).render(<SamplePreview />);
}