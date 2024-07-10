import { loadEnv } from "vitepress";
import { getData } from "../get-node-data";

const env = loadEnv("", process.cwd());

async function getImageLink(token: string) {
  const res = await fetch(
    `https://open.larksuite.com/open-apis/drive/v1/medias/batch_get_tmp_download_url?file_tokens=${token}`,
    {
      headers: {
        Authorization: `Bearer ${env.VITE_USER_TOKEN}`,
      },
    }
  );

  const {
    data,
  }: {
    code: number;
    data: {
      tmp_download_urls: {
        file_token: string;
        tmp_download_url: string;
      }[];
    };
  } = await res.json();

  return data.tmp_download_urls[0]?.tmp_download_url;
}

async function render(data: any) {
  switch (data.block_type) {
    case 1:
      return `# ${data.page.elements[0].text_run.content}`;

    case 2:
      return data.text.elements[0].text_run.content;

    case 3:
      return `# ${data.heading1.elements[0].text_run.content}`;

    case 4:
      return `## ${data.heading2.elements[0].text_run.content}`;

    case 5:
      return `### ${data.heading3.elements[0].text_run.content}`;

    case 6:
      return `#### ${data.heading4.elements[0].text_run.content}`;

    case 12:
      return `- ${data.bullet.elements[0].text_run.content}`;

    case 13:
      return `- ${data.ordered.elements[0].text_run.content}`;

    case 14:
      return `\`\`\`
${data.code.elements.map((i) => i.text_run.content).join("")}
\`\`\`
      `;

    case 27:
      return `![](${await getImageLink(data.image.token)})`;

    default:
      return "";
  }
}

const getPageData = async (id) => {
  const res = await fetch(
    `https://open.larksuite.com/open-apis/docx/v1/documents/${id}/blocks?document_revision_id=-1&page_size=500`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.VITE_USER_TOKEN}`,
      },
    }
  );

  const { data } = await res.json();

  if (!data) {
    return {
      params: { id },
    };
  }

  let content: any[] = [];

  for (const i of data.items) {
    content.push(await render(i));
  }

  return {
    params: { id, title: data.items[0].page.elements[0].text_run.content },
    content: content.join("\n\n"),
  };
};

export default {
  async paths() {
    const data = await getData();

    const getIds = (data): { id: string }[] =>
      data.items
        .map((d) => [
          { id: d.obj_token },
          ...d.children.map((c) => getIds(c)).flat(),
        ])
        .flat();

    const ids = getIds(data);

    const alldata = await Promise.all(ids.map(({ id }) => getPageData(id)));

    return alldata;
  },
};
