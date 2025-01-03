/*
 * Copyright 2021 The Backstage Authors
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
import React, { useEffect, useState } from 'react';
import useAsyncFn from 'react-use/esm/useAsyncFn';
import { useSearchParams } from 'react-router-dom';
import {
  Content,
  ContentHeader,
  ItemCardGrid,
  Progress,
  SupportButton,
  WarningPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { ToolCard } from './../ToolCard';
import { ExploreTool } from '@backstage-community/plugin-explore-common';

import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { exploreApiRef } from '../../api';
import Autocomplete from '@material-ui/lab/Autocomplete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles((theme: Theme) => ({
  filter: {
    '& + &': {
      marginTop: theme.spacing(2.5),
    },
  },
  filters: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
}));

const Body = (props: {
  tools: ExploreTool[];
  objectFit?: 'cover' | 'contain';
}) => {
  return (
    <ItemCardGrid>
      {props.tools.map((tool, index) => (
        <ToolCard key={index} card={tool} objectFit={props.objectFit} />
      ))}
    </ItemCardGrid>
  );
};

export const ToolExplorerContent = (props: {
  title?: string;
  objectFit?: 'cover' | 'contain';
  showTagsFilter?: boolean;
  showLifecycleFilter?: boolean;
}) => {
  const showTagsFilter = props.showTagsFilter ?? false;
  const showLifecycleFilter = props.showLifecycleFilter ?? false;
  const showFilters = showTagsFilter || showLifecycleFilter;
  const classes = useStyles();
  const [searchParams, setSearchParams] = useSearchParams();
  const exploreApi = useApi(exploreApiRef);
  const [filteredTags, setFilteredTags] = useState<string[]>(
    searchParams.getAll('tags'),
  );
  const [filteredLifecycle, setFilteredLifecycle] = useState<string[]>(
    searchParams.getAll('lifecycle'),
  );

  const handleTagsChange = (_event: React.ChangeEvent<{}>, value: any) => {
    setFilteredTags(value);
    setSearchParams({ tags: value }, { replace: true });
  };

  const handleLifecycleChange = (_event: React.ChangeEvent<{}>, value: any) => {
    setFilteredLifecycle(value);
    setSearchParams({ lifecycle: value }, { replace: true });
  };

  const [tools, fetchTools] = useAsyncFn(async () => {
    return (
      await exploreApi.getTools({
        filter: { tags: filteredTags, lifecycle: filteredLifecycle },
      })
    )?.tools;
  }, [exploreApi, filteredTags, filteredLifecycle]);

  const [uniqueTagsAndLifecycle, fetchTagsAndLifeCycles] =
    useAsyncFn(async () => {
      const allTools = (await exploreApi.getTools())?.tools;
      if (!allTools) {
        return {
          tags: [],
          lifecycles: [],
        };
      }

      const uniqueTags = new Set(allTools.map(tool => tool.tags ?? []).flat());
      const uniqueLifecycle = new Set(
        allTools.map(tool => tool.lifecycle ?? []).flat(),
      );

      return {
        tags: Array.from(uniqueTags),
        lifecycles: Array.from(uniqueLifecycle),
      };
    }, [exploreApi]);

  useEffect(() => {
    fetchTools();
    fetchTagsAndLifeCycles();
  }, [filteredTags, filteredLifecycle, fetchTagsAndLifeCycles, fetchTools]);

  return (
    <Content noPadding>
      <ContentHeader title={props.title ?? 'Tools'}>
        <SupportButton>Discover the tools in your ecosystem.</SupportButton>
      </ContentHeader>
      <Grid container>
        {showFilters && (
          <Grid item xs={12}>
            <Paper className={classes.filters}>
              {showTagsFilter && (
                <Autocomplete
                  multiple
                  options={uniqueTagsAndLifecycle.value?.tags ?? []}
                  className={classes.filter}
                  onChange={handleTagsChange}
                  id="tags-filter"
                  popupIcon={<ExpandMoreIcon data-testid="tag-picker-expand" />}
                  renderInput={params => (
                    <TextField {...params} label="Tags" variant="outlined" />
                  )}
                />
              )}
              {showLifecycleFilter && (
                <Autocomplete
                  multiple
                  options={uniqueTagsAndLifecycle.value?.lifecycles ?? []}
                  className={classes.filter}
                  onChange={handleLifecycleChange}
                  id="lifecycle-filter"
                  popupIcon={
                    <ExpandMoreIcon data-testid="lifecycle-picker-expand" />
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Lifecycle"
                      variant="outlined"
                    />
                  )}
                />
              )}
            </Paper>
          </Grid>
        )}
        <Grid item xs={12}>
          {(tools.loading || uniqueTagsAndLifecycle.loading) && <Progress />}
          {(tools.error || uniqueTagsAndLifecycle.error) && (
            <WarningPanel title="Failed to load tools" />
          )}
          {tools.value && tools.value.length === 0 && (
            <WarningPanel title="No tools found" />
          )}
          {tools.value && (
            <Body tools={tools.value} objectFit={props.objectFit} />
          )}
        </Grid>
      </Grid>
    </Content>
  );
};
