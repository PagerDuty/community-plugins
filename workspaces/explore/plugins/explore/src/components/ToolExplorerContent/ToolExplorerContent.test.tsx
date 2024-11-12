/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ExploreTool,
  GetExploreToolsRequest,
} from '@backstage-community/plugin-explore-common';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { exploreApiRef } from '../../api';
import { ToolExplorerContent } from './ToolExplorerContent';

describe('<ToolExplorerContent />', () => {
  const exploreApi: jest.Mocked<typeof exploreApiRef.T> = {
    getTools: jest.fn(),
  };

  const defaultTools: ExploreTool[] = [
    {
      title: 'Lighthouse',
      description:
        "Google's Lighthouse tool is a great resource for benchmarking and improving the accessibility, performance, SEO, and best practices of your website.",
      url: '/lighthouse',
      image:
        'https://raw.githubusercontent.com/GoogleChrome/lighthouse/8b3d7f052b2e64dd857e741d7395647f487697e7/assets/lighthouse-logo.png',
      tags: ['web', 'seo', 'accessibility', 'performance'],
    },
    {
      title: 'Tech Radar',
      description:
        'Tech Radar is a list of technologies, complemented by an assessment result, called ring assignment.',
      url: '/tech-radar',
      image:
        'https://storage.googleapis.com/wf-blogs-engineering-media/2018/09/fe13bb32-wf-tech-radar-hero-1024x597.png',
      lifecycle: 'experimental',
      tags: ['standards', 'landscape'],
    },
  ];

  const defaultTagFilterFunction = async (request?: GetExploreToolsRequest) => {
    if (
      request &&
      request.filter &&
      request.filter.tags &&
      request.filter.tags?.length > 0
    ) {
      const filteredTools = defaultTools.filter(tool => {
        return tool.tags?.some(tag => request.filter?.tags?.includes(tag));
      });

      return { tools: filteredTools };
    }
    return { tools: defaultTools };
  };

  const defaultLifecycleFilterFunction = async (
    request?: GetExploreToolsRequest,
  ) => {
    if (
      request &&
      request.filter &&
      request.filter.lifecycle &&
      request.filter.lifecycle?.length > 0
    ) {
      const filteredTools = defaultTools.filter(tool => {
        if (!tool.lifecycle) {
          return false;
        }
        return request.filter?.lifecycle?.includes(tool.lifecycle);
      });

      return { tools: filteredTools };
    }
    return { tools: defaultTools };
  };

  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <TestApiProvider apis={[[exploreApiRef, exploreApi]]}>
      {children}
    </TestApiProvider>
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders a grid of tools', async () => {
    exploreApi.getTools.mockImplementation(defaultTagFilterFunction);

    const { getByText } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByText('Lighthouse')).toBeInTheDocument();
      expect(getByText('Tech Radar')).toBeInTheDocument();
    });
  });

  it('renders a custom title', async () => {
    exploreApi.getTools.mockResolvedValue({ tools: [] });

    const { getByText } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent title="Our Tools" />
      </Wrapper>,
    );

    await waitFor(() => expect(getByText('Our Tools')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    exploreApi.getTools.mockResolvedValue({ tools: [] });

    const { getByText } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent />
      </Wrapper>,
    );

    await waitFor(() =>
      expect(getByText('Warning: No tools found')).toBeInTheDocument(),
    );
  });

  it('does not show lifecycle and tags filter by default', async () => {
    exploreApi.getTools.mockImplementation(defaultTagFilterFunction);

    const { queryByText } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(queryByText('Tags')).not.toBeInTheDocument();
      expect(queryByText('Lifecycle')).not.toBeInTheDocument();
    });
  });

  it('shows tags filter with correct options when showTagsFilter set', async () => {
    exploreApi.getTools.mockImplementation(defaultTagFilterFunction);

    const { getAllByRole, getByTestId } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent showTagsFilter />
      </Wrapper>,
    );

    fireEvent.click(getByTestId('tag-picker-expand'));
    await waitFor(() => {
      expect(getAllByRole('option').map(o => o.textContent)).toEqual([
        'web',
        'seo',
        'accessibility',
        'performance',
        'standards',
        'landscape',
      ]);
    });
  });

  it('filters by tags and updates tools displayed', async () => {
    exploreApi.getTools.mockImplementation(defaultTagFilterFunction);

    const { getByText, getByTestId, getByRole, queryByText } =
      await renderInTestApp(
        <Wrapper>
          <ToolExplorerContent showTagsFilter />
        </Wrapper>,
      );

    await waitFor(() => {
      expect(getByText('Lighthouse')).toBeInTheDocument();
      expect(getByText('Tech Radar')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('tag-picker-expand'));
    fireEvent.click(getByRole('option', { name: 'landscape' }));

    await waitFor(() => {
      expect(getByRole('button', { name: 'landscape' })).toBeInTheDocument();
      expect(getByText('Tech Radar')).toBeInTheDocument();
      expect(queryByText('Lighthouse')).not.toBeInTheDocument();
    });
  });

  it('uses query param to populate tag filter', async () => {
    exploreApi.getTools.mockImplementation(defaultTagFilterFunction);
    jest
      .spyOn(URLSearchParams.prototype, 'getAll')
      .mockReturnValue(['landscape']);

    const { getByText, queryByText } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent showTagsFilter />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(queryByText('Lighthouse')).not.toBeInTheDocument();
      expect(getByText('Tech Radar')).toBeInTheDocument();
    });
  });

  it('shows lifecycle filter with correct options when showLifeCycleFilter set', async () => {
    exploreApi.getTools.mockImplementation(defaultLifecycleFilterFunction);

    const { getAllByRole, getByTestId } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent showLifecycleFilter />
      </Wrapper>,
    );

    fireEvent.click(getByTestId('lifecycle-picker-expand'));
    await waitFor(() => {
      expect(getAllByRole('option').map(o => o.textContent)).toEqual([
        'experimental',
      ]);
    });
  });

  it('filters by lifecycle and updates tools displayed', async () => {
    exploreApi.getTools.mockImplementation(defaultLifecycleFilterFunction);
    const { getByText, getByTestId, getByRole, queryByText } =
      await renderInTestApp(
        <Wrapper>
          <ToolExplorerContent showLifecycleFilter />
        </Wrapper>,
      );

    await waitFor(() => {
      expect(getByText('Lighthouse')).toBeInTheDocument();
      expect(getByText('Tech Radar')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('lifecycle-picker-expand'));
    fireEvent.click(getByRole('option', { name: 'experimental' }));

    await waitFor(() => {
      expect(getByRole('button', { name: 'experimental' })).toBeInTheDocument();
      expect(getByText('Tech Radar')).toBeInTheDocument();
      expect(queryByText('Lighthouse')).not.toBeInTheDocument();
    });
  });

  it('uses query param to populate lifecycle filter', async () => {
    exploreApi.getTools.mockImplementation(defaultLifecycleFilterFunction);
    jest
      .spyOn(URLSearchParams.prototype, 'getAll')
      .mockReturnValue(['experimental']);

    const { getByText, queryByText } = await renderInTestApp(
      <Wrapper>
        <ToolExplorerContent showLifecycleFilter />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(queryByText('Lighthouse')).not.toBeInTheDocument();
      expect(getByText('Tech Radar')).toBeInTheDocument();
    });
  });
});
